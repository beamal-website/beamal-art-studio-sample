# 指定一堂的手動 Full／Available 狀態

制定：2026-10-15，程式修改前規格。完整 SchoolTracs＋Notion Goal 持續；本片只完成已確認的手動班額狀態及角標，沒有將正式入班、自動滿班或300 active驗收刪去。

## 目標、来源及明示假設

Notion來源 §5.4 第94–97行：Admin可提前標Full或強制Available；老師主色不變，右上另有紅／綠點；Absent／Sick／學生個別Pending不釋放班額。§3.1第50行明確Class Capacity與Trial／Rescheduling配額不同。

已確認的操作權限由Admin保存，授權Teacher只讀；沒有預設普通老師可編輯班額。正式Enrollment／ClassAttendance尚未實作，因此自動狀態及已確認佔用人數保持未知，不能用空名單、示範bookings、Trial 2/2或已轉換人物數推算班額。本片手動Available不能繞過將來報名的容量及資格檢查；是否容許超額、退課釋位等待答政策不靠本片決定。

以正式排課UUID＋固定sequence辨認某一堂，不按日期、老師名字或列表位置。移日、換老師、取消後Undo仍是同一堂；複製為新schedule ID不複製舊手動狀態。Standalone Available Slot沒有正式班次引用，沒有此班額標記。

## 技術與合約

沿用sample的Vite／原生JavaScript、Node HTTP及SQLite本機共用服務。新增獨立班額狀態表及audit表，不改舊表資料、schedule自身版本、quota／held reservations；不新增依賴、Login、ACL、CI或圖片。日後網站／iOS可透過同一API使用此狀態。

DTO：`{scheduleId,sequence,courseId,date,time,duration,classCapacity,classOccupied:null,automaticStatus:null,manualStatus:'full'|'available'|null,effectiveStatus:'full'|'available'|null,statusSource:'manual'|'unknown',version,sourceVersion,createdAt,updatedAt}`。未儲存有效堂為version0，timestamps null；已儲存version為正整數。sourceVersion是目前schedule.version。null佔用及null狀態必須呈現未知，不能當0或Available。

- `GET /api/class-capacity-statuses?from=YYYY-MM-DD&to=YYYY-MM-DD[&courseId=ID][&since=revision]`：必填有效包含首尾的日期範圍，最多366天；`{revision,statuses}`只列已保存且現有效／授權的堂，清除後null狀態仍有版本。相同revision回`{revision,unchanged:true}`。
- `GET /api/schedules/:id/occurrences/:sequence/capacity-status`：`{status}`，只讀目前有效且授權的同一堂；未儲存回上述version0。取消／deleted／不存在／課程已刪除回404，範圍不可讀不洩漏資料。
- `PATCH`同上：嚴格`{version,sourceVersion,manualStatus}`，Admin＋既有CSRF／Origin／operation key。status或來源版本不相符409；拒extra欄／不合法狀態／序號。成功200`{status}`，固定key重試不重複write／audit。清除用null，保留新status版本及audit。
- private linked AvailableSlot新增`classCapacityStatus`同DTO，`sourceVersions['class-status:'+scheduleId+':'+sequence]`為status.version；Standalone與anonymous public DTO／revision不增加這些資料。一次批量读狀態，避免逐Slot再查表或access scope遞迴。
- 前端SDK：`classCapacityStatuses(since='',query={})`、`classCapacityStatus(scheduleId,sequence)`、`saveClassCapacityStatus(current,manualStatus,operationKey)`；save只送開表status版本、sourceVersion及manualStatus。

程式沿用現有直白命名與驗證方式，例如：

```js
const recordKey = (scheduleId, sequence) => JSON.stringify([scheduleId, sequence]);
const manualStatus = value === '' ? null : value;
if (![null, 'full', 'available'].includes(manualStatus)) return;
```

## UI與資料更新

Admin由普通課堂詳情進入獨立「班額狀態」dialog，只修改指定UUID＋sequence；不在整套排課表單偷改所有堂。開表先讀最新status，三選一Full／Available／清除手動標記，顯示課程、日期時間、Class Capacity及未知佔用；清除恢復依正式人數判斷，現階段未知。

Pure UI：`classCapacityStatusMarkup(status,{t,esc,compact=false})`、`classCapacityStatusEditorMarkup({current,lesson,busy=false,error=''},{t,esc})`。lesson為`{courseName,date,time,duration}`；current為上述DTO。Badge使用`.class-capacity-status-badge`／`data-class-status=full|available|unknown`，compact為課表右上小點＋可讀ARIA／tooltip，非compact為点及可見文字。未知使用中性標記及明確文字。紅／綠只作獨立狀態點，不覆蓋老師主色或假定報名可通過。

Editor selector：`.class-status-editor-dialog`、`#class-capacity-status-editor`、radio `name=manualStatus`值full／available／空字串（null），`#class-capacity-status-save`／`#class-capacity-status-error`；取消／關閉`data-action=class-status-cancel`。僅submit可保存；Cancel／Escape／Back離開不寫入；pending鎖定、鍵盤焦點圈及390雙語保持可用。409保留草稿並要求重新讀取，不暗中覆蓋。

五個Timetable檢視及普通課詳情顯示同一狀態；linked Slot跟隨同堂，Standalone不冒充Class。readonly詳情只局部更新badge／文字，不重建輸入草稿或失去焦點。Admin開表可顯示新鮮來源的日期時間；跨帳戶／登出／路由／選堂後的舊回覆不可重開或改另一堂。成功ACK即顯同堂新狀態，後續讀503保已成功資料，不能重複保存；較舊status或linked source回覆不得將新版本退回。相同scope及source引用按版本合併，改引用不借舊標記。

驗收補充：linked投影與獨立狀態讀取雙方向接收同一堂較新版本，較新Slot配置與較新班額狀態分開保留。相同503不再觸發整頁重畫；真正資料更新仍會刷新，並按UUID＋固定sequence還原普通課堂按鈕焦點。取消linked來源時不顯示已失效的班額投影，但保留已保存的狀態版本供Undo及同步判斷。

## 分工與順序

1. Backend worker：class-capacity-status.mjs、store/app/available-slots與new HTTP tests；先真RED，再最小保存／授權／投影GREEN。
2. UI worker：pure class-capacity-status-ui.js、CSS、pure UI tests；先RED→GREEN，保留Beamal圖片與老師主色。
3. 獨立QA：flows.test.mjs、api-client.test.mjs，先SDK RED及有意義公開操作回歸，再等Root接線跑GREEN；保留舊assert。
4. Root：SDK/runtime接線、資料／來源合併與真正Admin／Teacher／另一Admin／手機驗收、docs及Git。各人保留他人改動；僅test，保留原提案及真.data私密資料。

## 驗證及完成條件

命令依修改所屬順序使用：`node --test sample/server/tests/class-capacity-status.test.mjs`；`node --test sample/tests/class-capacity-status-ui.test.mjs`；`node --test sample/tests/api-client.test.mjs sample/tests/flows.test.mjs`。最後Root依序`npm test --prefix sample`→`npm run build --prefix sample`，不可平行，不以窄套件替代完整檢查。

必須證明：Admin Full→重開／重啟／另一Admin及授權Teacher同一堂紅點；Available綠點、clear未知；未授權者不能讀改；409、pending、取消及舊身份回覆安全；移日／換老師／cancel→Undo保同sequence、新複製無標記；班額／日期／費用／身份／Trial及held前後不變；private linked同堂同步、anonymous白名單／revision不受手動標記改變。保留自動7/8→8/8、Attendance／Enrollment完整流程及超額政策缺口，不宣稱C-04/C-05、111項或300 active整體完成。

界線：Always驗身份、版本、真測試及畫面；需新增依賴／CI／AGENTS／main／對外發送等另行處理；Never猜未決業務、讀／提交credentials、用示範0造正式空位、略過核心或削弱測試。例行本機schema及API由已授權完整系統開發與獨立驗收自動繼續規則涵蓋；本片不建立新授權或部署。
