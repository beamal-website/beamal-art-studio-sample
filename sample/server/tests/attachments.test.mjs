import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdtemp,mkdir,readdir,readFile,rm,stat,symlink,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {request as httpRequest} from 'node:http';
import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';
import {syncBuiltinESMExports} from 'node:module';
import {fixture,error,origin,users,noCredentials} from './helpers.mjs';

// Complete files generated once with ffmpeg, verified with ffprobe, then
// embedded here so the HTTP suite needs no media programs or network access.
const encodedMedia=[{"name":"studio.png","mimeType":"image/png","base64":"iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAAACXBIWXMAAAABAAAAAQBPJcTWAAAAF0lEQVR4nGP8x0AaYCFR/aiGUQ1DSAMAaw8BPJLkRBUAAAAASUVORK5CYII="},{"name":"studio.jpg","mimeType":"image/jpeg","base64":"/9j/4AAQSkZJRgABAgAAAQABAAD//gAQTGF2YzYyLjI4LjEwMgD/2wBDAAgEBAQEBAUFBQUFBQYGBgYGBgYGBgYGBgYHBwcICAgHBwcGBgcHCAgICAkJCQgICAgJCQoKCgwMCwsODg4RERT/xABMAAEBAAAAAAAAAAAAAAAAAAAABgEBAQAAAAAAAAAAAAAAAAAABgcQAQAAAAAAAAAAAAAAAAAAAAARAQAAAAAAAAAAAAAAAAAAAAD/wAARCAAQABADASIAAhEAAxEA/9oADAMBAAIRAxEAPwCLAE1/f//Z"},{"name":"studio.gif","mimeType":"image/gif","base64":"R0lGODlhEAAQAPcfMQAAACQAAEgAAGwAAJAAALQAANgAAPwAAAAkACQkAEgkAGwkAJAkALQkANgkAPwkAABIACRIAEhIAGxIAJBIALRIANhIAPxIAABsACRsAEhsAGxsAJBsALRsANhsAPxsAACQACSQAEiQAGyQAJCQALSQANiQAPyQAAC0ACS0AEi0AGy0AJC0ALS0ANi0APy0AADYACTYAEjYAGzYAJDYALTYANjYAPzYAAD8ACT8AEj8AGz8AJD8ALT8ANj8APz8AAAAVSQAVUgAVWwAVZAAVbQAVdgAVfwAVQAkVSQkVUgkVWwkVZAkVbQkVdgkVfwkVQBIVSRIVUhIVWxIVZBIVbRIVdhIVfxIVQBsVSRsVUhsVWxsVZBsVbRsVdhsVfxsVQCQVSSQVUiQVWyQVZCQVbSQVdiQVfyQVQC0VSS0VUi0VWy0VZC0VbS0Vdi0Vfy0VQDYVSTYVUjYVWzYVZDYVbTYVdjYVfzYVQD8VST8VUj8VWz8VZD8VbT8Vdj8Vfz8VQAAqiQAqkgAqmwAqpAAqrQAqtgAqvwAqgAkqiQkqkgkqmwkqpAkqrQkqtgkqvwkqgBIqiRIqkhIqmxIqpBIqrRIqthIqvxIqgBsqiRsqkhsqmxsqpBsqrRsqthsqvxsqgCQqiSQqkiQqmyQqpCQqrSQqtiQqvyQqgC0qiS0qki0qmy0qpC0qrS0qti0qvy0qgDYqiTYqkjYqmzYqpDYqrTYqtjYqvzYqgD8qiT8qkj8qmz8qpD8qrT8qtj8qvz8qgAA/yQA/0gA/2wA/5AA/7QA/9gA//wA/wAk/yQk/0gk/2wk/5Ak/7Qk/9gk//wk/wBI/yRI/0hI/2xI/5BI/7RI/9hI//xI/wBs/yRs/0hs/2xs/5Bs/7Rs/9hs//xs/wCQ/ySQ/0iQ/2yQ/5CQ/7SQ/9iQ//yQ/wC0/yS0/0i0/2y0/5C0/7S0/9i0//y0/wDY/yTY/0jY/2zY/5DY/7TY/9jY//zY/wD8/yT8/0j8/2z8/5D8/7T8/9j8//z8/yH/C05FVFNDQVBFMi4wAwEAAAAh+QQEBAAfACwAAAAAEAAQAAAIJwAPCBxIsKDBgwgTDjRwkKHChxAjQnRYkKLEixgXNszIsWPFjQIDAgA7"},{"name":"studio.mp4","mimeType":"video/mp4","base64":"AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDEAAAAIZnJlZQAAAnZtZGF0AAACUwYF//9P3EXpvebZSLeWLNgg2SPu73gyNjQgLSBjb3JlIDE2NSByMzIyMiBiMzU2MDVhIC0gSC4yNjQvTVBFRy00IEFWQyBjb2RlYyAtIENvcHlsZWZ0IDIwMDMtMjAyNSAtIGh0dHA6Ly93d3cudmlkZW9sYW4ub3JnL3gyNjQuaHRtbCAtIG9wdGlvbnM6IGNhYmFjPTAgcmVmPTEgZGVibG9jaz0wOjA6MCBhbmFseXNlPTA6MCBtZT1kaWEgc3VibWU9MCBwc3k9MSBwc3lfcmQ9MS4wMDowLjAwIG1peGVkX3JlZj0wIG1lX3JhbmdlPTE2IGNocm9tYV9tZT0xIHRyZWxsaXM9MCA4eDhkY3Q9MCBjcW09MCBkZWFkem9uZT0yMSwxMSBmYXN0X3Bza2lwPTEgY2hyb21hX3FwX29mZnNldD0wIHRocmVhZHM9MSBsb29rYWhlYWRfdGhyZWFkcz0xIHNsaWNlZF90aHJlYWRzPTAgbnI9MCBkZWNpbWF0ZT0xIGludGVybGFjZWQ9MCBibHVyYXlfY29tcGF0PTAgY29uc3RyYWluZWRfaW50cmE9MCBiZnJhbWVzPTAgd2VpZ2h0cD0wIGtleWludD0yNTAga2V5aW50X21pbj0xIHNjZW5lY3V0PTAgaW50cmFfcmVmcmVzaD0wIHJjPWNyZiBtYnRyZWU9MCBjcmY9MjMuMCBxY29tcD0wLjYwIHFwbWluPTAgcXBtYXg9NjkgcXBzdGVwPTQgaXBfcmF0aW89MS40MCBhcT0wAIAAAAATZYiEOhGKAAIY8cAAQPY4AAh5YAAAAw1tb292AAAAbG12aGQAAAAAAAAAAAAAAAAAAAPoAAAD6AABAAABAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAACN3RyYWsAAABcdGtoZAAAAAMAAAAAAAAAAAAAAAEAAAAAAAAD6AAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAEAAAAAAEAAAABAAAAAAACRlZHRzAAAAHGVsc3QAAAAAAAAAAQAAA+gAAAAAAAEAAAAAAa9tZGlhAAAAIG1kaGQAAAAAAAAAAAAAAAAAAEAAAABAAFXEAAAAAAAtaGRscgAAAAAAAAAAdmlkZQAAAAAAAAAAAAAAAFZpZGVvSGFuZGxlcgAAAAFabWluZgAAABR2bWhkAAAAAQAAAAAAAAAAAAAAJGRpbmYAAAAcZHJlZgAAAAAAAAABAAAADHVybCAAAAABAAABGnN0YmwAAAC2c3RzZAAAAAAAAAABAAAApmF2YzEAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAEAAQAEgAAABIAAAAAAAAAAEVTGF2YzYyLjI4LjEwMiBsaWJ4MjY0AAAAAAAAAAAAAAAY//8AAAAsYXZjQwFCwAr/4QAVZ0LACtp7ARAAAAMAEAAAAwAg8SJqAQAEaM4PyAAAABBwYXNwAAAAAQAAAAEAAAAUYnRydAAAAAAAABNwAAAAAAAAABhzdHRzAAAAAAAAAAEAAAABAABAAAAAABxzdHNjAAAAAAAAAAEAAAABAAAAAQAAAAEAAAAUc3RzegAAAAAAAAJuAAAAAQAAABRzdGNvAAAAAAAAAAEAAAAwAAAAYnVkdGEAAABabWV0YQAAAAAAAAAhaGRscgAAAAAAAAAAbWRpcmFwcGwAAAAAAAAAAAAAAAAtaWxzdAAAACWpdG9vAAAAHWRhdGEAAAABAAAAAExhdmY2Mi4xMi4xMDI="},{"name":"studio.avi","mimeType":"video/vnd.avi","base64":"UklGRtYWAABBVkkgTElTVDgSAABoZHJsYXZpaDgAAABAQg8AqGEAAAAAAAAQCQAAAQAAAAAAAAABAAAAAAAQABAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAExJU1TgEAAAc3RybHN0cmg4AAAAdmlkc0ZNUDQAAAAAAAAAAAAAAAABAAAAAQAAAAAAAAABAAAAQwAAAP////8AAAAAAAAAABAAEABzdHJmKAAAACgAAAAQAAAAEAAAAAEAGABGTVA0AAMAAAAAAAAAAAAAAAAAAAAAAABKVU5LGBAAAAQAAAAAAAAAMDBkYwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB2cHJwRAAAAAAAAAAAAAAAAQAAABAAAAAQAAAAAQABABAAAAAQAAAAAQAAABAAAAAQAAAAEAAAABAAAAAAAAAAAAAAAAAAAAAAAAAASlVOSwQBAABvZG1sZG1saPgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAExJU1QaAAAASU5GT0lTRlQOAAAATGF2ZjYyLjEyLjEwMgBKVU5L+AMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAATElTVFAAAABtb3ZpMDBkY0MAAAAAAAGwAQAAAbWJEwAAAQAAAAEgAMSNiAANAIQCFGMAAAGyTGF2YzYyLjI4LjEwMgAAAbMAEAcAAAG2FgUYUG2CyB4PAGlkeDEQAAAAMDBkYxAAAAAEAAAAQwAAAA=="},{"name":"studio.mov","mimeType":"video/quicktime","base64":"AAAAFGZ0eXBxdCAgAAACAHF0ICAAAAAId2lkZQAAAnZtZGF0AAACUwYF//9P3EXpvebZSLeWLNgg2SPu73gyNjQgLSBjb3JlIDE2NSByMzIyMiBiMzU2MDVhIC0gSC4yNjQvTVBFRy00IEFWQyBjb2RlYyAtIENvcHlsZWZ0IDIwMDMtMjAyNSAtIGh0dHA6Ly93d3cudmlkZW9sYW4ub3JnL3gyNjQuaHRtbCAtIG9wdGlvbnM6IGNhYmFjPTAgcmVmPTEgZGVibG9jaz0wOjA6MCBhbmFseXNlPTA6MCBtZT1kaWEgc3VibWU9MCBwc3k9MSBwc3lfcmQ9MS4wMDowLjAwIG1peGVkX3JlZj0wIG1lX3JhbmdlPTE2IGNocm9tYV9tZT0xIHRyZWxsaXM9MCA4eDhkY3Q9MCBjcW09MCBkZWFkem9uZT0yMSwxMSBmYXN0X3Bza2lwPTEgY2hyb21hX3FwX29mZnNldD0wIHRocmVhZHM9MSBsb29rYWhlYWRfdGhyZWFkcz0xIHNsaWNlZF90aHJlYWRzPTAgbnI9MCBkZWNpbWF0ZT0xIGludGVybGFjZWQ9MCBibHVyYXlfY29tcGF0PTAgY29uc3RyYWluZWRfaW50cmE9MCBiZnJhbWVzPTAgd2VpZ2h0cD0wIGtleWludD0yNTAga2V5aW50X21pbj0xIHNjZW5lY3V0PTAgaW50cmFfcmVmcmVzaD0wIHJjPWNyZiBtYnRyZWU9MCBjcmY9MjMuMCBxY29tcD0wLjYwIHFwbWluPTAgcXBtYXg9NjkgcXBzdGVwPTQgaXBfcmF0aW89MS40MCBhcT0wAIAAAAATZYiEOhGKAAIY8cAAQPY4AAh5YAAAAuRtb292AAAAbG12aGQAAAAAAAAAAAAAAAAAAAPoAAAD6AABAAABAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAACT3RyYWsAAABcdGtoZAAAAAMAAAAAAAAAAAAAAAEAAAAAAAAD6AAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAEAAAAAAEAAAABAAAAAAACRlZHRzAAAAHGVsc3QAAAAAAAAAAQAAA+gAAAAAAAEAAAAAAcdtZGlhAAAAIG1kaGQAAAAAAAAAAAAAAAAAAEAAAABAAH//AAAAAAAtaGRscgAAAABtaGxydmlkZQAAAAAAAAAAAAAAAAxWaWRlb0hhbmRsZXIAAAFybWluZgAAABR2bWhkAAAAAQAAAAAAAAAAAAAALGhkbHIAAAAAZGhscnVybCAAAAAAAAAAAAAAAAALRGF0YUhhbmRsZXIAAAAkZGluZgAAABxkcmVmAAAAAAAAAAEAAAAMdXJsIAAAAAEAAAEGc3RibAAAAKJzdHNkAAAAAAAAAAEAAACSYXZjMQAAAAAAAAABAAAAAEZGTVAAAAIAAAACAAAQABAASAAAAEgAAAAAAAAAARVMYXZjNjIuMjguMTAyIGxpYngyNjQAAAAAAAAAAAAAABj//wAAACxhdmNDAULACv/hABVnQsAK2nsBEAAAAwAQAAADACDxImoBAARozg/IAAAAEHBhc3AAAAABAAAAAQAAABhzdHRzAAAAAAAAAAEAAAABAABAAAAAABxzdHNjAAAAAAAAAAEAAAABAAAAAQAAAAEAAAAUc3RzegAAAAAAAAJuAAAAAQAAABRzdGNvAAAAAAAAAAEAAAAkAAAAIXVkdGEAAAAZqXN3cgANVcRMYXZmNjIuMTIuMTAy"},{"name":"studio.mp3","mimeType":"audio/mpeg","base64":"SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjYyLjEyLjEwMgAAAAAAAAAAAAAA/+M4wAAAAAAAAAAAAEluZm8AAAAPAAAABAAAAfgAkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKStra2tra2tra2tra2tra2tra2tra2tra2ttvb29vb29vb29vb29vb29vb29vb29vb29v/////////////////////////////////AAAAAExhdmM2Mi4yOAAAAAAAAAAAAAAAACQEQAAAAAAAAAH4yz/magAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/+MYxAAK+I7FuUMAAqoFKLbQHd3d3P4iIifu7u//1wMDA3NQQOIg+D78EHXf4Y4DfpDHLv5zp93SrU0aq////f7KYZlT/f///+MYxA8QkSKgAZlAAIfynXM+p7DA4L7B7hPJ2XndOvcHQWg1KFhb/8A5Bhj2qkwzSv//noYJjgkDVv6GvR//eipFSZl/pniZ/+MYxAcOmPqoAZJYAC5/lYLLgOaBQuvwIieWkk4en///zZ51Fjkn/4BDIdAJn/w6AUngCn/88AUngCk9//jUsXVMQU1FNC4w/+MYxAcAAANIAcAAAFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV"},{"name":"studio.wav","mimeType":"audio/wav","base64":"UklGRkYFAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAATElTVBoAAABJTkZPSVNGVA4AAABMYXZmNjIuMTIuMTAyAGRhdGEABQAAAABrBTIKxQ22D80PBQ6UCuQFgQAP+zP2f/Jk8CHwv/EM9ab5//52BGYJOw1+D+0Peg5QC9AGggEG/AP3D/Ok8AnwUfFX9L34/v19A5IIpAw3D/0P4A4ADLUHgQIB/dz3rfPz8AHw8/Cs89v3AP2AArQH/wvfDv0PNw+kDJMIfQP//b34V/RS8Qnwo/AP8wL3BfyBAc8GUAt5Du0Pfw87DWcJdwT//qb5DfW/8SHwY/B+8jL2DvuAAOMFlAoEDs0Ptw/FDTMKbAUAAJX6zvU78krwM/D78Wz1HPp///EEzQmBDZwP3w9BDvQKWgYBAYr7mvbF8oLwE/CG8bD0MPl+/voD/QjxDFwP9w+vDqkLQwcCAoP8bvdc88nwA/Ag8QD0S/h//f8CJAhTDA0P/w8ND1QMJQgAA4D9TPgB9CHxA/DJ8FzzbfeD/AECQwepC64O9w9dD/EM/gj7A3/+Mfmw9IfxE/CB8MXymfaJ+wEBWgbzCkEO3w+dD4INzgnyBID/Hfps9fzxM/BJ8DvyzfWU+gAAawUyCsUNtg/NDwUOlArkBYEAD/sz9n/yZPAh8L/xDPWm+f/+dgRmCTsNfg/tD3oOUAvQBoIBBvwD9w/zpPAJ8FHxV/S9+P79fQOSCKQMNw/9D+AOAAy1B4ECAf3c963z8/AB8PPwrPPb9wD9gAK0B/8L3w79DzcPpAyTCH0D//29+Ff0UvEJ8KPwD/MC9wX8gQHPBlALeQ7tD38POw1nCXcE//6m+Q31v/Eh8GPwfvIy9g77gADjBZQKBA7ND7cPxQ0zCmwFAACV+s71O/JK8DPw+/Fs9Rz6f//xBM0JgQ2cD98PQQ70CloGAQGK+5r2xfKC8BPwhvGw9DD5fv76A/0I8QxcD/cPrw6pC0MHAgKD/G73XPPJ8APwIPEA9Ev4f/3/AiQIUwwND/8PDQ9UDCUIAAOA/Uz4AfQh8QPwyfBc8233g/wBAkMHqQuuDvcPXQ/xDP4I+wN//jH5sPSH8RPwgfDF8pn2ifsBAVoG8wpBDt8PnQ+CDc4J8gSA/x36bPX88TPwSfA78s31lPoAAGsFMgrFDbYPzQ8FDpQK5AWBAA/7M/Z/8mTwIfC/8Qz1pvn//nYEZgk7DX4P7Q96DlAL0AaCAQb8A/cP86TwCfBR8Vf0vfj+/X0DkgikDDcP/Q/gDgAMtQeBAgH93Pet8/PwAfDz8Kzz2/cA/YACtAf/C98O/Q83D6QMkwh9A//9vfhX9FLxCfCj8A/zAvcF/IEBzwZQC3kO7Q9/DzsNZwl3BP/+pvkN9b/xIfBj8H7yMvYO+4AA4wWUCgQOzQ+3D8UNMwpsBQAAlfrO9TvySvAz8PvxbPUc+n//8QTNCYENnA/fD0EO9ApaBgEBivua9sXygvAT8IbxsPQw+X7++gP9CPEMXA/3D68OqQtDBwICg/xu91zzyfAD8CDxAPRL+H/9/wIkCFMMDQ//Dw0PVAwlCAADgP1M+AH0IfED8MnwXPNt94P8AQJDB6kLrg73D10P8Qz+CPsDf/4x+bD0h/ET8IHwxfKZ9on7AQFaBvMKQQ7fD50Pgg3OCfIEgP8d+mz1/PEz8EnwO/LN9ZT6AABrBTIKxQ22D80PBQ6UCuQFgQAP+zP2f/Jk8CHwv/EM9ab5//52BGYJOw1+D+0Peg5QC9AGggEG/AP3D/Ok8AnwUfFX9L34/v19A5IIpAw="},{"name":"studio.m4a","mimeType":"audio/x-m4a","base64":"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"}];
const media=encodedMedia.map(({base64,...descriptor})=>({...descriptor,bytes:Buffer.from(base64,'base64')}));

function pdfBytes(totalSize){
 const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 10 10] /Contents 4 0 R >>'];
 let before='%PDF-1.4\n',offsets=[0];
 objects.forEach((object,index)=>{offsets.push(Buffer.byteLength(before));before+=`${index+1} 0 obj\n${object}\nendobj\n`});
 offsets.push(Buffer.byteLength(before));
 let streamLength=2,prefix,suffix;
 for(;;){
  prefix=before+`4 0 obj\n<< /Length ${streamLength} >>\nstream\n`;
  const xrefOffset=Buffer.byteLength(prefix)+streamLength+Buffer.byteLength('endstream\nendobj\n');
  suffix='endstream\nendobj\nxref\n0 5\n0000000000 65535 f \n'+offsets.slice(1).map(offset=>`${String(offset).padStart(10,'0')} 00000 n \n`).join('')+`trailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  const length=Buffer.byteLength(prefix)+streamLength+Buffer.byteLength(suffix);
  if(totalSize===undefined||length===totalSize)break;
  streamLength+=totalSize-length;assert.ok(streamLength>=2,'PDF fixture target must fit a complete document');
 }
 const stream=Buffer.alloc(streamLength,0x20);stream[0]=0x25;stream[stream.length-1]=0x0a;
 return Buffer.concat([Buffer.from(prefix),stream,Buffer.from(suffix)]);
}
media.push({name:'studio.pdf',mimeType:'application/pdf',bytes:pdfBytes()});
const png=media.find(file=>file.name.endsWith('.png'));
function paddedBMFF(file,{largeSize=false}={}){
 const firstSize=file.bytes.readUInt32BE(0),padding=Buffer.alloc(20_000+(largeSize?16:8));
 padding.writeUInt32BE(largeSize?1:padding.length);padding.write('free',4);
 if(largeSize)padding.writeBigUInt64BE(BigInt(padding.length),8);
 const bytes=Buffer.concat([file.bytes.subarray(0,firstSize),padding,file.bytes.subarray(firstSize)]);
 // Moving complete media boxes requires moving each sample's chunk offset,
 // so these are playable containers rather than signature-only byte blobs.
 for(let position=0;(position=bytes.indexOf('stco',position))>=0;position+=4){
  const count=bytes.readUInt32BE(position+8);
  for(let index=0;index<count;index++){const offset=position+12+index*4;bytes.writeUInt32BE(bytes.readUInt32BE(offset)+padding.length,offset);}
 }
 return {...file,name:(largeSize?'Large-size atom ':'Padded atom ')+file.name,bytes};
}
const material=(extra={})=>({name:'Attachment lesson',description:'Complete files shared with enrolled students.',videoLinks:[],visibleToStudents:false,studentDownload:false,...extra});
async function adminFixture(t,options={}){const app=await fixture(t,options),admin=app.client(),login=await admin.login(0);return {...app,admin,owner:login.body.user};}
function binaryHeaders(client,{csrf=true,requestOrigin=origin,headers={}}={}){
 const result={...headers};
 if(requestOrigin!==null)result.Origin=requestOrigin;
 if(client.cookies.size)result.Cookie=[...client.cookies].map(([name,value])=>`${name}=${value}`).join('; ');
 if(csrf&&client.csrfToken&&!Object.hasOwn(result,'X-CSRF-Token'))result['X-CSRF-Token']=client.csrfToken;
 return result;
}
async function binary(client,path,{method='GET',bytes,csrf=true,requestOrigin=origin,headers={},signal}={}){
 const response=await fetch(client.base+path,{method,headers:binaryHeaders(client,{csrf,requestOrigin,headers}),body:bytes,signal});
 const body=Buffer.from(await response.arrayBuffer()),contentType=response.headers.get('content-type')||'';
 return {status:response.status,headers:response.headers,bytes:body,body:/application\/json/i.test(contentType)&&body.length?JSON.parse(body.toString()):null,text:/application\/json/i.test(contentType)?body.toString():''};
}
async function upload(client,file=png,{courseId='public-course',key=randomUUID(),...options}={}){
 return binary(client,`/api/courses/${courseId}/material-uploads`,{method:'POST',bytes:file.bytes,...options,headers:{'Content-Type':file.mimeType,'X-File-Name':encodeURIComponent(file.name),'Idempotency-Key':key,...options.headers}});
}
function uploadDTO(result,file){
 assert.equal(result.status,201,result.text);noCredentials(result);
 const descriptor=result.body.upload;
 assert.deepEqual(Object.keys(descriptor).sort(),['id','name','mimeType','size','createdAt'].sort());
 assert.equal(typeof descriptor.id,'string');assert.ok(descriptor.id);assert.equal(descriptor.name,file.name);assert.equal(descriptor.mimeType,file.mimeType);assert.equal(descriptor.size,file.bytes.length);assert.ok(Number.isFinite(Date.parse(descriptor.createdAt)));
 assert.doesNotMatch(JSON.stringify(descriptor),/storagePath|filePath|\/tmp\/|passwordHash|sessionToken/);
 return descriptor;
}
async function createMaterial(client,attachments,extra={},headers={}){
 const response=await client.request('/api/courses/public-course/materials',{method:'POST',body:material({attachments,...extra}),headers});
 assert.equal(response.status,201,response.text);return response.body.material;
}
const attachmentPath=(saved,attachment)=>`/api/materials/${saved.id}/attachments/${attachment.id}`;
async function privateFixture(t,options={}){
 const directory=await mkdtemp(join(tmpdir(),'beamal-attachment-qa-'));
 t.after(()=>rm(directory,{recursive:true,force:true}));
 const attachmentsDir=join(directory,'private-files');
 return {...await adminFixture(t,{attachmentsDir,...options}),directory,attachmentsDir};
}
async function diskFiles(directory){
 const entries=await readdir(directory,{withFileTypes:true}).catch(cause=>{if(cause.code==='ENOENT')return [];throw cause});
 return (await Promise.all(entries.map(entry=>entry.isDirectory()?diskFiles(join(directory,entry.name)):[join(directory,entry.name)]))).flat();
}
async function rawHTTP(client,path,{method='POST',headers={},chunks=[]}={}){
 return new Promise((resolve,reject)=>{
  // Deliberately incomplete Content-Length requests cannot share a keepalive
  // connection with the following independent chunked upload.
  const request=httpRequest(client.base+path,{method,agent:false,headers:binaryHeaders(client,{headers})},response=>{
   const chunks=[];response.on('data',chunk=>chunks.push(chunk));response.on('error',reject);
   response.on('end',()=>{const bytes=Buffer.concat(chunks),text=bytes.toString();resolve({status:response.statusCode,headers:response.headers,bytes,text,body:/application\/json/i.test(response.headers['content-type']||'')&&text?JSON.parse(text):null})});
  });
  request.setTimeout(5000,()=>request.destroy(new Error('Upload did not reject invalid framing within five seconds')));
  request.on('error',reject);for(const chunk of chunks)request.write(chunk);request.end();
 });
}

// This first acceptance test is deliberately run before the upload route
// exists, providing independent red evidence before backend implementation.
test('complete PNG JPG GIF MP4 AVI MOV MP3 WAV M4A and PDF files upload and become authenticated material attachments',async t=>{
 const app=await adminFixture(t),descriptors=[];
 for(const file of media)descriptors.push(uploadDTO(await upload(app.admin,file),file));
 const saved=await createMaterial(app.admin,descriptors.map(file=>file.id));
 assert.deepEqual(saved.attachments,descriptors);
 for(let index=0;index<media.length;index++){
  const response=await binary(app.admin,attachmentPath(saved,descriptors[index]));
  assert.equal(response.status,200,response.text);assert.deepEqual(response.bytes,media[index].bytes);
  assert.equal(response.headers.get('content-type'),media[index].mimeType);
  assert.match(response.headers.get('content-disposition')||'',/^inline;/);
  assert.equal(response.headers.get('x-content-type-options'),'nosniff');assert.match(response.headers.get('cache-control')||'',/no-store/);
 }
});

test('binary uploads enforce real authenticated admin sessions, CSRF and origins before accepting any file',async t=>{
 const app=await privateFixture(t),anonymous=app.client(),other=app.client(),teacher=app.client(),student=app.client();
 await other.login(1);await teacher.login(2);await student.login(3);
 error(await upload(anonymous),401);
 for(const client of [teacher,student])error(await upload(client,png,{headers:{'X-User-Role':'admin'}}),403);
 for(const options of [{csrf:false},{headers:{'X-CSRF-Token':'wrong'}},{headers:{'X-CSRF-Token':other.csrfToken}},{requestOrigin:'https://untrusted.example.test'}])error(await upload(app.admin,png,options),403);
 error(await upload(app.admin,png,{courseId:'nonexistent-course'}),404);
 assert.deepEqual(await diskFiles(app.attachmentsDir),[],'Refused upload requests must not create private files');
 assert.equal(app.materials.audit().length,0);
});

test('staged attachments cannot be fetched publicly or attached across another actor, course or material',async t=>{
 const app=await adminFixture(t),other=app.client();await other.login(1);
 const first=uploadDTO(await upload(app.admin),png),foreign=uploadDTO(await upload(other),png),wrongCourse=uploadDTO(await upload(app.admin,png,{courseId:'private-course'}),png);
 error(await binary(app.admin,`/api/material-uploads/${first.id}`),404);
 for(const ids of [[foreign.id],[wrongCourse.id],['missing-upload'],[first.id,foreign.id]])error(await app.admin.request('/api/courses/public-course/materials',{method:'POST',body:material({attachments:ids})}),404);
 assert.equal(app.materials.audit().length,0);
 const saved=await createMaterial(app.admin,[first.id]);assert.deepEqual(saved.attachments,[first]);
 const foreignSaved=await createMaterial(other,[foreign.id]);assert.deepEqual(foreignSaved.attachments,[foreign]);
 error(await app.admin.request('/api/courses/public-course/materials',{method:'POST',body:material({attachments:[first.id]})}),404);
 const otherEdit=await other.request(`/api/materials/${saved.id}`,{method:'PATCH',body:{attachments:[first.id],description:'Another manager retains the existing attachment',version:saved.version}});
 assert.equal(otherEdit.status,200,otherEdit.text);assert.deepEqual(otherEdit.body.material.attachments,[first]);
 error(await app.admin.request(`/api/materials/${foreignSaved.id}`,{method:'PATCH',body:{attachments:[foreign.id,first.id],version:foreignSaved.version}}),404);
 assert.deepEqual((await app.admin.request(`/api/materials/${foreignSaved.id}`)).body.material,foreignSaved);
});

test('failed material creation rolls back all attachment links, audit and operation receipt so staged files remain reusable',async t=>{
 const app=await adminFixture(t),file=uploadDTO(await upload(app.admin),png),headers={'Idempotency-Key':randomUUID()};
 error(await app.admin.request('/api/courses/public-course/materials',{method:'POST',body:material({name:'',attachments:[file.id]}),headers}),400);
 error(await app.admin.request('/api/courses/public-course/materials',{method:'POST',body:material({attachments:[file.id,'missing-upload']}),headers}),404);
 assert.equal(app.materials.audit().length,0);
 assert.deepEqual((await app.admin.request('/api/courses/public-course/materials')).body.materials,[]);
 const input=material({attachments:[file.id]}),saved=await createMaterial(app.admin,[file.id],{},headers);
 assert.deepEqual(saved.attachments,[file]);assert.equal(app.materials.audit().length,1);
 const replay=await app.admin.request('/api/courses/public-course/materials',{method:'POST',body:input,headers});
 assert.equal(replay.status,201,replay.text);assert.deepEqual(replay.body.material,saved);assert.equal(app.materials.audit().length,1);
});

test('attachment edits preserve omitted fields, reject stale versions atomically and replay one acknowledged PATCH',async t=>{
 const app=await adminFixture(t),first=uploadDTO(await upload(app.admin),png),jpg=media.find(file=>file.name.endsWith('.jpg')),second=uploadDTO(await upload(app.admin,jpg),jpg);
 const saved=await createMaterial(app.admin,[first.id]),renamed=await app.admin.request(`/api/materials/${saved.id}`,{method:'PATCH',body:{name:'Updated lesson',version:saved.version}});
 assert.equal(renamed.status,200,renamed.text);assert.deepEqual(renamed.body.material.attachments,[first]);
 const before=renamed.body.material,audits=app.materials.audit().length;
 error(await app.admin.request(`/api/materials/${saved.id}`,{method:'PATCH',body:{name:'Stale edit',attachments:[first.id,second.id],version:saved.version}}),409);
 assert.deepEqual((await app.admin.request(`/api/materials/${saved.id}`)).body.material,before);assert.equal(app.materials.audit().length,audits);
 const input={description:'Two files saved together',attachments:[first.id,second.id],version:before.version},headers={'Idempotency-Key':randomUUID()};
 const responses=await Promise.all(Array.from({length:5},()=>app.admin.request(`/api/materials/${saved.id}`,{method:'PATCH',body:input,headers})));
 for(const response of responses){assert.equal(response.status,200,response.text);assert.deepEqual(response.body,responses[0].body)}
 const updated=responses[0].body.material;assert.equal(updated.version,before.version+1);assert.deepEqual(updated.attachments,[first,second]);assert.equal(app.materials.audit().length,audits+1);
 error(await app.admin.request(`/api/materials/${saved.id}`,{method:'PATCH',body:{...input,description:'Changed retry payload'},headers}),409);
 error(await app.admin.request(`/api/materials/${saved.id}`,{method:'PATCH',body:input}),409);
 assert.deepEqual((await binary(app.admin,attachmentPath(updated,second))).bytes,jpg.bytes);
});

test('removing one or all attachment IDs removes their direct URLs while preserving the remaining immutable descriptors',async t=>{
 const app=await adminFixture(t),first=uploadDTO(await upload(app.admin),png),pdf=media.find(file=>file.name.endsWith('.pdf')),second=uploadDTO(await upload(app.admin,pdf),pdf),saved=await createMaterial(app.admin,[first.id,second.id]);
 const removed=await app.admin.request(`/api/materials/${saved.id}`,{method:'PATCH',body:{attachments:[first.id],version:saved.version}});assert.equal(removed.status,200,removed.text);
 assert.deepEqual(removed.body.material.attachments,[first]);assert.deepEqual((await binary(app.admin,attachmentPath(saved,first))).bytes,png.bytes);
 error(await binary(app.admin,attachmentPath(saved,second)),404);
 const unrelated=await app.admin.request(`/api/materials/${saved.id}`,{method:'PATCH',body:{description:'Metadata-only edit',version:removed.body.material.version}});assert.equal(unrelated.status,200,unrelated.text);assert.deepEqual(unrelated.body.material.attachments,[first]);
 const cleared=await app.admin.request(`/api/materials/${saved.id}`,{method:'PATCH',body:{attachments:[],version:unrelated.body.material.version}});assert.equal(cleared.status,200,cleared.text);assert.deepEqual(cleared.body.material.attachments,[]);
 error(await binary(app.admin,attachmentPath(saved,first)),404);
});

test('invalid attachment lists never partially consume stages or change an existing material',async t=>{
 const app=await adminFixture(t),file=uploadDTO(await upload(app.admin),png),saved=await createMaterial(app.admin,[]),audits=app.materials.audit().length;
 for(const attachments of [null,{},'one-file',[null],[1],[{id:file.id}],[file.id,file.id]]){
  error(await app.admin.request('/api/courses/public-course/materials',{method:'POST',body:material({attachments})}),400);
  error(await app.admin.request(`/api/materials/${saved.id}`,{method:'PATCH',body:{attachments,version:saved.version}}),400);
  assert.deepEqual((await app.admin.request(`/api/materials/${saved.id}`)).body.material,saved);assert.equal(app.materials.audit().length,audits);
 }
 const attached=await app.admin.request(`/api/materials/${saved.id}`,{method:'PATCH',body:{attachments:[file.id],version:saved.version}});assert.equal(attached.status,200,attached.text);assert.deepEqual(attached.body.material.attachments,[file]);
});

test('ten identical upload retries store one file and identical material creates attach it once, while keys remain account and course isolated',async t=>{
 const app=await privateFixture(t),key=randomUUID(),responses=await Promise.all(Array.from({length:10},()=>upload(app.admin,png,{key})));
 const file=uploadDTO(responses[0],png);for(const response of responses){assert.equal(response.status,201,response.text);assert.deepEqual(response.body,responses[0].body)}
 assert.equal((await diskFiles(app.attachmentsDir)).length,1);
 const jpg=media.find(file=>file.name.endsWith('.jpg')),conflict=await upload(app.admin,jpg,{key});error(conflict,409);assert.equal(conflict.body.error.code,'IDEMPOTENCY_CONFLICT');assert.equal((await diskFiles(app.attachmentsDir)).length,1);
 const other=app.client();await other.login(1);const another=uploadDTO(await upload(other,png,{key}),png),privateFile=uploadDTO(await upload(app.admin,png,{key,courseId:'private-course'}),png);
 assert.notEqual(another.id,file.id);assert.notEqual(privateFile.id,file.id);
 const body=material({attachments:[file.id]}),headers={'Idempotency-Key':randomUUID()},creates=await Promise.all(Array.from({length:10},()=>app.admin.request('/api/courses/public-course/materials',{method:'POST',body,headers})));
 for(const response of creates){assert.equal(response.status,201,response.text);assert.deepEqual(response.body,creates[0].body)}
 assert.equal(app.materials.audit().length,1);assert.deepEqual(creates[0].body.material.attachments,[file]);
});

test('material attachment view and download enforce grants, visibility and student download settings for GET HEAD and ranges',async t=>{
 const app=await adminFixture(t,{seedMaterialAccess:[{courseId:'public-course',email:users[3].email}]}),granted=app.client(),ungranted=app.client(),teacher=app.client(),anonymous=app.client();
 await granted.login(3);await ungranted.login(4);await teacher.login(2);
 const file=uploadDTO(await upload(app.admin),png),saved=await createMaterial(app.admin,[file.id],{visibleToStudents:true,studentDownload:false}),path=attachmentPath(saved,file);
 assert.deepEqual((await binary(granted,path)).bytes,png.bytes);
 assert.equal((await binary(granted,path,{method:'HEAD'})).status,200);
 for(const options of [{},{method:'HEAD'},{headers:{Range:'bytes=0-4'}}]){
  assert.equal((await binary(anonymous,path,options)).status,401);assert.equal((await binary(ungranted,path,options)).status,404);
  assert.equal((await binary(granted,path+'?download=1',options)).status,403);
 }
 const teacherDownload=await binary(teacher,path+'?download=1');assert.equal(teacherDownload.status,200,teacherDownload.text);assert.deepEqual(teacherDownload.bytes,png.bytes);assert.match(teacherDownload.headers.get('content-disposition')||'',/^attachment;/);
 const enabled=await app.admin.request(`/api/materials/${saved.id}`,{method:'PATCH',body:{studentDownload:true,version:saved.version}});assert.equal(enabled.status,200,enabled.text);
 assert.equal((await binary(granted,path+'?download=1')).status,200);
 const hidden=await app.admin.request(`/api/materials/${saved.id}`,{method:'PATCH',body:{visibleToStudents:false,version:enabled.body.material.version}});assert.equal(hidden.status,200,hidden.text);
 for(const suffix of ['', '?download=1'])for(const options of [{},{method:'HEAD'},{headers:{Range:'bytes=0-4'}}])assert.equal((await binary(granted,path+suffix,options)).status,404,'Hidden content and its byte size must not be discoverable through direct URLs');
 assert.equal((await binary(teacher,path)).status,200);
 error(await binary(app.admin,`/api/materials/not-this-material/attachments/${file.id}`),404);
});

test('supported extensions and MIME types must match complete file bytes and invalid uploads leave no private files',async t=>{
 const app=await privateFixture(t),jpg=media.find(file=>file.name.endsWith('.jpg')),pdf=media.find(file=>file.name.endsWith('.pdf')),mov=media.find(file=>file.name.endsWith('.mov'));
 const invalid=[
  {...png,bytes:Buffer.alloc(0)}, {...png,bytes:png.bytes.subarray(0,8)}, {...jpg,bytes:jpg.bytes.subarray(0,12)},
  {...pdf,bytes:Buffer.from('%PDF-1.4\n')}, {...mov,bytes:mov.bytes.subarray(0,20)},
  {...pdf,bytes:Buffer.from('<html><script>alert(1)</script></html>')},
  {...png,mimeType:'image/jpeg'}, {...png,name:'wrong-extension.jpg'}, {...pdf,name:'active-content.html'},
 ];
 for(const file of invalid)error(await upload(app.admin,file),400);
 for(const mimeType of ['text/html','image/svg+xml','application/octet-stream','application/x-msdownload'])error(await upload(app.admin,{...png,mimeType}),415);
 assert.deepEqual(await diskFiles(app.attachmentsDir),[],'Rejected/truncated files must not remain as recoverable stages');
 assert.equal(app.materials.audit().length,0);
});

test('unsafe filenames cannot escape storage or inject response headers while Unicode and HTML-like names stay inert data',async t=>{
 const app=await privateFixture(t),pdf=media.find(file=>file.name.endsWith('.pdf'));
 for(const name of ['', ' ', '.', '..', '../studio.png', '/tmp/studio.png', 'folder/studio.png', 'folder\\studio.png', 'studio\nX-Forged: yes.png', 'studio\r.png', 'studio\0.png', 'studio\t.png', '😀'.repeat(252)+'.png'])error(await upload(app.admin,{...png,name}),400);
 error(await upload(app.admin,png,{headers:{'X-File-Name':'%E0%A4%A'}}),400);
 assert.deepEqual(await diskFiles(app.attachmentsDir),[]);
 const maximum={...png,name:'😀'.repeat(251)+'.png'};uploadDTO(await upload(app.admin,maximum),maximum);
 const unicode={...pdf,name:'教材 <img src=x onerror=alert(1)> & "測試".pdf'},descriptor=uploadDTO(await upload(app.admin,unicode),unicode),saved=await createMaterial(app.admin,[descriptor.id]);
 const response=await binary(app.admin,attachmentPath(saved,descriptor)+'?download=1');
 assert.equal(response.status,200,response.text);assert.deepEqual(response.bytes,pdf.bytes);assert.equal(response.headers.get('content-type'),'application/pdf');assert.equal(response.headers.get('x-content-type-options'),'nosniff');
 const disposition=response.headers.get('content-disposition')||'',encoded=disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
 assert.ok(encoded,'Unicode names need a safe RFC 5987 filename* header');assert.equal(decodeURIComponent(encoded),unicode.name);assert.doesNotMatch(disposition,/\r|\n/);
 const files=await diskFiles(app.attachmentsDir);assert.equal(files.length,2);assert.ok(files.every(file=>!file.endsWith(unicode.name)&&!file.endsWith(maximum.name)),'Private storage keys must not use the user-supplied name');
});

test('the decimal 50 MB boundary is accepted and declared or chunked overflow is refused without storing oversized files',async t=>{
 const app=await privateFixture(t),limit=50_000_000,boundary={name:'exact-limit.pdf',mimeType:'application/pdf',bytes:pdfBytes(limit)};
 assert.equal(boundary.bytes.length,limit);
 const accepted=uploadDTO(await upload(app.admin,boundary),boundary);assert.equal(accepted.size,limit);
 const declared=await rawHTTP(app.admin,'/api/courses/public-course/material-uploads',{headers:{'Content-Type':'application/pdf','X-File-Name':encodeURIComponent('declared-overflow.pdf'),'Idempotency-Key':randomUUID(),'Content-Length':String(limit+1)},chunks:[Buffer.from('%PDF-1.4\n')]});
 error(declared,413);
 const overflow=pdfBytes(limit+1),chunked=await rawHTTP(app.admin,'/api/courses/public-course/material-uploads',{headers:{'Content-Type':'application/pdf','X-File-Name':encodeURIComponent('chunked-overflow.pdf'),'Idempotency-Key':randomUUID()},chunks:[overflow.subarray(0,1000),overflow.subarray(1000)]});
 error(chunked,413);
 const files=await diskFiles(app.attachmentsDir);assert.equal(files.length,1);assert.equal((await stat(files[0])).size,limit,'Only the accepted complete boundary file may remain');
});

test('an aborted upload with incomplete Content-Length leaves no partial file or receipt and the same operation can be retried',async t=>{
 const app=await privateFixture(t),key=randomUUID(),path='/api/courses/public-course/material-uploads';
 await new Promise((resolve,reject)=>{
  const onRequest=incoming=>{
   if(incoming.url!==path)return;
   incoming.once('data',()=>{incoming.once('aborted',resolve);request.destroy()});
  };
  app.server.once('request',onRequest);
  const request=httpRequest(app.admin.base+path,{method:'POST',headers:binaryHeaders(app.admin,{headers:{'Content-Type':png.mimeType,'X-File-Name':encodeURIComponent(png.name),'Idempotency-Key':key,'Content-Length':String(png.bytes.length+1)}})});
  request.on('error',cause=>{if(cause.code!=='ECONNRESET')reject(cause)});
  request.setTimeout(5000,()=>{request.destroy();reject(new Error('The server did not observe the incomplete upload'))});
  request.end(png.bytes);
 });
 const retried=uploadDTO(await upload(app.admin,png,{key}),png);
 const saved=await createMaterial(app.admin,[retried.id]);assert.deepEqual((await binary(app.admin,attachmentPath(saved,retried))).bytes,png.bytes);
 const files=await diskFiles(app.attachmentsDir);assert.equal(files.length,1);assert.deepEqual(await readFile(files[0]),png.bytes,'Only the complete retry may remain');
});

test('authenticated attachment byte ranges and HEAD return accurate headers without exposing bodies or accepting invalid ranges',async t=>{
 const app=await adminFixture(t),file=uploadDTO(await upload(app.admin),png),saved=await createMaterial(app.admin,[file.id]),path=attachmentPath(saved,file),size=png.bytes.length;
 const full=await binary(app.admin,path);assert.equal(full.status,200);assert.equal(full.headers.get('content-length'),String(size));assert.equal(full.headers.get('accept-ranges'),'bytes');assert.deepEqual(full.bytes,png.bytes);
 const head=await binary(app.admin,path,{method:'HEAD'});assert.equal(head.status,200);assert.equal(head.headers.get('content-length'),String(size));assert.equal(head.bytes.length,0);
 for(const [range,start,end] of [['bytes=5-12',5,12],['bytes=-5',size-5,size-1],['bytes=5-',5,size-1]]){
  const response=await binary(app.admin,path,{headers:{Range:range}});assert.equal(response.status,206,response.text);assert.equal(response.headers.get('content-range'),`bytes ${start}-${end}/${size}`);assert.equal(response.headers.get('content-length'),String(end-start+1));assert.deepEqual(response.bytes,png.bytes.subarray(start,end+1));
  const rangeHead=await binary(app.admin,path,{method:'HEAD',headers:{Range:range}});assert.equal(rangeHead.status,206);assert.equal(rangeHead.headers.get('content-range'),response.headers.get('content-range'));assert.equal(rangeHead.headers.get('content-length'),response.headers.get('content-length'));assert.equal(rangeHead.bytes.length,0);
 }
 for(const range of [`bytes=${size}-`,'bytes=10-2','bytes=0-1,5-7','invalid','bytes=-0']){
  const response=await binary(app.admin,path,{headers:{Range:range}});assert.equal(response.status,416,response.text);assert.equal(response.headers.get('content-range'),`bytes */${size}`);
  const head=await binary(app.admin,path,{method:'HEAD',headers:{Range:range}});assert.equal(head.status,416);assert.equal(head.headers.get('content-range'),`bytes */${size}`);assert.equal(head.bytes.length,0);
 }
 const anonymous=await binary(app.client(),path,{headers:{Range:`bytes=${size}-`}});assert.equal(anonymous.status,401);assert.equal(anonymous.headers.get('content-range'),null,'Authentication must run before revealing the attachment size');
});

test('file-backed attachments and create/update receipts survive restart and private bytes are never served from public paths',async t=>{
 const directory=await mkdtemp(join(tmpdir(),'beamal-attachment-restart-')),attachmentsDir=join(directory,'private'),staticDir=join(directory,'public'),databasePath=join(directory,'database.sqlite');let second;
 t.after(async()=>{await second?.close();await rm(directory,{recursive:true,force:true})});
 await mkdir(staticDir);await writeFile(join(staticDir,'index.html'),'<html>Public website</html>');
 const options={databasePath,attachmentsDir,staticDir,seedMaterialAccess:[{courseId:'public-course',email:users[3].email}]},first=await adminFixture(t,options),uploadKey=randomUUID(),descriptor=uploadDTO(await upload(first.admin,png,{key:uploadKey}),png),createKey=randomUUID();
 const saved=await createMaterial(first.admin,[descriptor.id],{visibleToStudents:true,studentDownload:true},{'Idempotency-Key':createKey}),input={description:'Persisted attachment edit',attachments:[descriptor.id],version:saved.version},headers={'Idempotency-Key':randomUUID()};
 const update=await first.admin.request(`/api/materials/${saved.id}`,{method:'PATCH',body:input,headers});assert.equal(update.status,200,update.text);const current=update.body.material,audits=first.materials.audit().length,files=await diskFiles(attachmentsDir);
 assert.equal(files.length,1);assert.equal((await stat(attachmentsDir)).mode&0o077,0);assert.equal((await stat(files[0])).mode&0o077,0);assert.deepEqual(await readFile(files[0]),png.bytes);
 await first.close();assert.equal((await diskFiles(attachmentsDir)).length,1,'Closing a persistent service must retain its private attachments');
 second=await adminFixture(t,options);
 const uploadReplay=await upload(second.admin,png,{key:uploadKey});assert.equal(uploadReplay.status,201,uploadReplay.text);assert.deepEqual(uploadReplay.body.upload,descriptor);
 const createReplay=await second.admin.request('/api/courses/public-course/materials',{method:'POST',body:material({attachments:[descriptor.id],visibleToStudents:true,studentDownload:true}),headers:{'Idempotency-Key':createKey}});assert.equal(createReplay.status,201,createReplay.text);assert.deepEqual(createReplay.body.material,saved);
 const editReplay=await second.admin.request(`/api/materials/${saved.id}`,{method:'PATCH',body:input,headers});assert.equal(editReplay.status,200,editReplay.text);assert.deepEqual(editReplay.body.material,current);assert.equal(second.materials.audit().length,audits);
 const student=second.client();await student.login(3);assert.deepEqual((await binary(student,attachmentPath(current,descriptor))).bytes,png.bytes);
 for(const path of [`/${png.name}`,`/private/${png.name}`,`/../private/${files[0].split('/').at(-1)}`,`/assets/${descriptor.id}`]){
  const response=await binary(second.client(),path);assert.notDeepEqual(response.bytes,png.bytes);assert.notEqual(response.headers.get('content-type'),'image/png');
 }
 assert.equal((await diskFiles(attachmentsDir)).length,1);
});

test('closing an in-memory service removes only its owned temporary attachment directory',async t=>{
 const app=await adminFixture(t),descriptor=uploadDTO(await upload(app.admin),png),directory=app.attachments?.directory||app.attachmentsDir;
 assert.equal(typeof directory,'string','Expose the owned temporary directory to internal tests, never to HTTP clients');
 const saved=await createMaterial(app.admin,[descriptor.id]);assert.deepEqual((await binary(app.admin,attachmentPath(saved,descriptor))).bytes,png.bytes);
 assert.equal((await diskFiles(directory)).length,1);await app.close();
 await assert.rejects(stat(directory),cause=>cause.code==='ENOENT','The memory service must clean up its private temporary folder');
});

test('attachment storage cannot be configured beneath the public website even through symlink aliases or new nested directories',async t=>{
 const directory=await mkdtemp(join(tmpdir(),'beamal-attachment-public-path-'));t.after(()=>rm(directory,{recursive:true,force:true}));
 const publicDir=join(directory,'public'),alias=join(directory,'public-alias');await mkdir(publicDir);await symlink(publicDir,alias,'dir');
 for(const [index,options] of [
  {staticDir:publicDir,attachmentsDir:join(publicDir,'attachments')},
  {staticDir:publicDir,attachmentsDir:join(alias,'not-created','attachments')},
  {staticDir:alias,attachmentsDir:join(publicDir,'nested-attachments')},
 ].entries())await assert.rejects(fixture(t,{databasePath:join(directory,`blocked-${index}.sqlite`),...options}),/private|public|static|outside|overlap/i,'A public or alias-backed storage configuration must be refused before serving attachments');
});

test('the twenty attachment limit fails atomically and leaves all valid stages reusable in later materials',async t=>{
 const app=await adminFixture(t),ids=[];
 for(let index=0;index<21;index++)ids.push(uploadDTO(await upload(app.admin,{...png,name:`attachment-${index}.png`}),{...png,name:`attachment-${index}.png`}));
 const headers={'Idempotency-Key':randomUUID()};
 error(await app.admin.request('/api/courses/public-course/materials',{method:'POST',body:material({attachments:ids.map(file=>file.id)}),headers}),400);
 assert.equal(app.materials.audit().length,0);assert.deepEqual((await app.admin.request('/api/courses/public-course/materials')).body.materials,[]);
 const first=await createMaterial(app.admin,ids.slice(0,20).map(file=>file.id),{},headers);assert.deepEqual(first.attachments,ids.slice(0,20));
 const remaining=await createMaterial(app.admin,[ids[20].id]);assert.deepEqual(remaining.attachments,[ids[20]]);assert.equal(app.materials.audit().length,2);
});

test('expired unattached stages are cleaned while saved attachment bytes and links remain readable',async t=>{
 const app=await privateFixture(t),attached=uploadDTO(await upload(app.admin),png),jpg=media.find(file=>file.name.endsWith('.jpg')),pending=uploadDTO(await upload(app.admin,jpg),jpg),saved=await createMaterial(app.admin,[attached.id]);
 assert.equal((await diskFiles(app.attachmentsDir)).length,2);
 const originalNow=Date.now,expiredTime=originalNow()+25*60*60*1000;
 try{Date.now=()=>expiredTime;await app.attachments.cleanup()}finally{Date.now=originalNow}
 assert.equal((await diskFiles(app.attachmentsDir)).length,1,'Cleanup must remove unclaimed expired bytes while retaining active material attachments');
 assert.deepEqual((await binary(app.admin,attachmentPath(saved,attached))).bytes,png.bytes);
 error(await app.admin.request('/api/courses/public-course/materials',{method:'POST',body:material({attachments:[pending.id]})}),404);
 assert.deepEqual((await app.admin.request(`/api/materials/${saved.id}`)).body.material,saved);assert.equal(app.materials.audit().length,1);
});

test('unknown null course associations return validation errors without creating receipts, consuming staged files or mutating materials',async t=>{
 const app=await adminFixture(t),file=uploadDTO(await upload(app.admin),png),headers={'Idempotency-Key':randomUUID()};
 error(await app.admin.request('/api/courses/public-course/materials',{method:'POST',body:material({attachments:[file.id],courseIds:null}),headers}),400);
 assert.equal(app.materials.audit().length,0);
 const saved=await createMaterial(app.admin,[file.id],{},headers),patchHeaders={'Idempotency-Key':randomUUID()};
 error(await app.admin.request(`/api/materials/${saved.id}`,{method:'PATCH',body:{description:'Refused malformed association',courseIds:null,version:saved.version},headers:patchHeaders}),400);
 assert.deepEqual((await app.admin.request(`/api/materials/${saved.id}`)).body.material,saved);assert.equal(app.materials.audit().length,1);
 const corrected=await app.admin.request(`/api/materials/${saved.id}`,{method:'PATCH',body:{description:'Corrected using the same uncached key',version:saved.version},headers:patchHeaders});assert.equal(corrected.status,200,corrected.text);assert.deepEqual(corrected.body.material.attachments,[file]);assert.equal(app.materials.audit().length,2);
});

test('complete playable MP4 MOV and M4A containers accept media boxes after large free atoms including 64-bit atom sizes',async t=>{
 const app=await adminFixture(t),files=media.filter(file=>/\.(mp4|mov|m4a)$/.test(file.name));
 for(const original of files)for(const largeSize of [false,true]){
  const file=paddedBMFF(original,{largeSize});assert.ok(file.bytes.length>20_000);
  const descriptor=uploadDTO(await upload(app.admin,file),file),saved=await createMaterial(app.admin,[descriptor.id]);
  assert.deepEqual((await binary(app.admin,attachmentPath(saved,descriptor))).bytes,file.bytes);
 }
});

test('invalid top-level video atom boundaries or missing media/index boxes cannot be accepted merely because the header contains their names',async t=>{
 const app=await privateFixture(t),original=media.find(file=>file.name.endsWith('.mp4')),firstSize=original.bytes.readUInt32BE(0),moov=original.bytes.indexOf('moov')-4,mdat=original.bytes.indexOf('mdat')-4,mdatSize=original.bytes.readUInt32BE(mdat),cases=[];
 const short=Buffer.from(original.bytes);short.writeUInt32BE(7,firstSize);cases.push(short);
 const tooLong=Buffer.from(original.bytes);tooLong.writeUInt32BE(original.bytes.length+100,firstSize);cases.push(tooLong);
 const consumesRemainder=Buffer.from(original.bytes);consumesRemainder.writeUInt32BE(0,firstSize);cases.push(consumesRemainder);
 const invalidLarge=paddedBMFF(original,{largeSize:true}).bytes;invalidLarge.writeBigUInt64BE(15n,firstSize+8);cases.push(invalidLarge);
 cases.push(original.bytes.subarray(0,moov));
 const emptyMedia=Buffer.alloc(8);emptyMedia.writeUInt32BE(8);emptyMedia.write('mdat',4);cases.push(Buffer.concat([original.bytes.subarray(0,mdat),emptyMedia,original.bytes.subarray(mdat+mdatSize)]));
 for(const bytes of cases)error(await upload(app.admin,{...original,bytes}),400);
 assert.deepEqual(await diskFiles(app.attachmentsDir),[]);assert.equal(app.materials.audit().length,0);
});

test('large material lists preserve exact role-scoped attachment DTOs across batch boundaries without one attachment query per material',async t=>{
 const app=await adminFixture(t,{seedMaterialAccess:[{courseId:'public-course',email:users[3].email}]}),teacher=app.client(),student=app.client(),ungranted=app.client();await teacher.login(2);await student.login(3);await ungranted.login(4);
 const first=uploadDTO(await upload(app.admin),png),pdf=media.find(file=>file.name.endsWith('.pdf')),last=uploadDTO(await upload(app.admin,pdf),pdf),all=[];
 all.push(await createMaterial(app.admin,[first.id],{name:'First attached material',visibleToStudents:true}));
 // Fixture setup uses the real repository; the operation under measurement
 // remains a real authenticated HTTP list with more than 900 eligible IDs.
 for(let index=0;index<900;index++)all.push(app.materials.create('public-course',material({name:`Visible preparation ${index}`,visibleToStudents:true}),app.owner));
 all.push(await createMaterial(app.admin,[last.id],{name:'Last attached material',visibleToStudents:true}));
 all.push(await createMaterial(app.admin,[],{name:'Hidden staff preparation',visibleToStudents:false}));
 all.sort((left,right)=>left.createdAt<right.createdAt?-1:left.createdAt>right.createdAt?1:left.id<right.id?-1:left.id>right.id?1:0);
 const originalPrepare=DatabaseSync.prototype.prepare;let attachmentQueries=0;
 DatabaseSync.prototype.prepare=function(sql,...args){if(/^\s*SELECT\b/i.test(sql)&&/\bmaterial_attachments\b/i.test(sql))attachmentQueries++;return originalPrepare.call(this,sql,...args)};
 try{
  for(const client of [app.admin,teacher,student]){
   attachmentQueries=0;const response=await client.request('/api/courses/public-course/materials');assert.equal(response.status,200,response.text);
   const expected=client===student?all.filter(item=>item.visibleToStudents):all;
   assert.deepEqual(response.body.materials,expected,'Batching must preserve every attachment, owner, version and list position in the permitted DTO');
   assert.equal(attachmentQueries,2,'A list crossing the 900-ID boundary needs two attachment batches, not a query for every row');
  }
  attachmentQueries=0;error(await ungranted.request('/api/courses/public-course/materials'),404);assert.equal(attachmentQueries,0,'An unauthorised list must not fetch hidden attachment descriptors');
 }finally{DatabaseSync.prototype.prepare=originalPrepare}
});

test('repeated real attachment GET HEAD and range requests close their file descriptors without double-close errors',async t=>{
 const app=await adminFixture(t),file=uploadDTO(await upload(app.admin),png),saved=await createMaterial(app.admin,[file.id]),path=attachmentPath(saved,file),originalClose=fs.close,failures=[];
 // Observe actual operating-system close results, while retaining every real
 // read and close operation. A successful body alone can hide double closes.
 fs.close=(descriptor,callback)=>originalClose(descriptor,error=>{if(error)failures.push(error.code);callback(error)});syncBuiltinESMExports();
 try{
  for(let index=0;index<100;index++){
   const method=index%2?'HEAD':'GET',range=index%4===0,options={method,signal:AbortSignal.timeout(3000),...(range?{headers:{Range:'bytes=0-4'}}:{})};
   const response=await binary(app.admin,path,options);assert.equal(response.status,range?206:200,response.text);
   assert.deepEqual(response.bytes,method==='HEAD'?Buffer.alloc(0):range?png.bytes.subarray(0,5):png.bytes);
  }
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(failures.length,0,`Attachment stream cleanup must have one descriptor owner; actual close errors: ${JSON.stringify(failures.slice(0,5))}`);
 }finally{fs.close=originalClose;syncBuiltinESMExports()}
});
