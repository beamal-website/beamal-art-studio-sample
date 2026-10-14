# 老師代表色：正式保存與時間表連動

制定：2026-10-15，實作前規格。沿用完整 SchoolTracs＋Notion Goal；上一片 Availability 已推送，這一片繼續課程／時間表，不縮減其他核心或300 active驗收。

## 來源、目標及假設

Notion §5.4（notion-requirements-source.md 第92–97行）／C-03：Admin可為每名老師指定代表色，其課表時段以授課老師色作主要底色／標識。§5.4的Full/Available角標與老師主色是不同維度；正式Class人數與公開Trial配額亦不同。代表色不修改授课指派、容量、資格、預約、Attendance或學生貼紙。

本片用已存在的正式teacher scheduling resource UUID；老師排課資料與Login、完整Staff Profile仍獨立，不藉顏色功能建立帳戶。舊文字老師不按姓名配對。未設定顏色為null，不替舊資料猜色。非破壞性使用既有metadata欄，無新依賴／schema／CI改動。

單堂只有一個正式teacher ID，且其代表色已設定時，普通排課及Overall Available Slot的主色引用該老師目前值。未設定／無正式老師時保留現有排課色（可約時段保留中性Beamal色）；不改寫schedule.color。多老師主色尚未定義，已詢問平均分段或指定主要老師；未回答前不選teacherIds[0]或捏造主老師。可列各授課老師的名稱及色樣供辨認，但不把這種參考標識當作已決定多人主色政策。C-03整項仍保留此缺口。

## 合約及檔案

- 正式Teacher DTO新增 `representativeColor:null|'#rrggbb'`。只允許6位hex，保存時轉小寫；拒絕短hex、CSS函數、URL、任意字串及room的該欄位。
- Admin沿用 `POST/PATCH /api/scheduling-resources`、CSRF／Origin、版本／同operation key、resource audit。Create省略為null；PATCH省略保留目前值，null明確清除；只有色更新亦合法。Name／active／Room metadata回歸不变。Teacher仍唯讀。
- 已存在teacher metadata缺欄讀null；持久／重開可證。更新老師色提高resource.version，scoped revision與私有Slot sourceVersions跟隨變化；color只作投影，不寫schedule/Slot自己的version、source identity、quota或held reservation。
- 私有AvailableSlot DTO新增與teacherIds／teacherNames順序一致的 `teacherColors`（null／合法hex），單人即可不靠全校resource清單繪色；anonymous public DTO不添加teacher resource ID或私人metadata。Public Course Details不是內部課表，本片不擴其白名單。
- Pure UI helper `sample/client/teacher-colour-ui.js`：從正式指派或Slot投影讀色、安全CSS、可讀名稱／色樣，只有單一正式老師可覆蓋主色；不解析legacy text。
- `sample/client/scheduling-resources-ui.js`：Teacher List／Editor代表色，清除或保持未設定、可見預覽與雙語說明；Room表單不出現色欄。使用既有Save／Cancel／pending鎖定／Escape。
- `sample/src.js`：Teacher save payload白名單、編輯開表版本；resources fresh/ACK更新在同身份時同步普通排課及AvailableSlot繪色。日／週／range／月／list使用同一色邏輯，list條目提供可讀色樣；單堂換老師引用實際occurrence teacherIds而不沿用系列初始老師。
- 延遲的Slot儲存回覆分開合併自身設定與來源資料：新Slot版本／配額／備註保留；同一linked課堂引用保留較新的課堂版本及老師、日期、時間、時長、班額；老師名稱／色樣按相同UUID及resource來源版本成對保留。Standalone明確新指派與時間仍以儲存回覆為準，不能借用別人的色。已知Trial／Reschedule餘額以新配額重算，未知Total占用仍為null。
- `sample/style.css`：Beamal色系內的色樣與柔和主色；白／黑／深色仍保持文字可讀及鍵盤焦點；不得把Full狀態用成整卡紅色。無图片变更。

## 分工、驗證及完成條件

Backend worker只負責scheduling-resources.mjs、available-slots.mjs與其HTTP測試；metadata相容、角色、保存版本、sourceVersions／held一致性及匿名白名單。UI worker只負責pure helper、resource UI／CSS與純UI測試。Root負責src接線／SDK如必要、主流程／真正瀏覽器、docs與Git。獨立QA審查跨身份／舊回覆／多老師缺口；所有人保留他人改動，不操作main／真.data／原提案。

先可重現RED再GREEN。指定命令：

- `node --test sample/server/tests/scheduling-resources.test.mjs sample/server/tests/available-slots.test.mjs`
- `node --test sample/tests/scheduling-resources-ui.test.mjs sample/tests/teacher-colour-ui.test.mjs sample/tests/flows.test.mjs`
- 最後依序 `npm test --prefix sample` → `npm run build --prefix sample`，不平行。

驗收路徑：Admin給正式Teacher B色→保存重開／另一Admin讀相同ID色→既有普通單人排課及獨立／linked Slot同步新色→Teacher自身範圍同色且只讀→改色與清除不改排課時間／學生／配額／held identity→手機390中英文、Cancel／Back／衝突保草稿及pending鎖定。深淺色字可讀。多老師未定期間保留原主色＋各人色樣，不默認主老師、不列整C-03完成。

C-04/C-05仍需正式Enrollment／Class occupancy與manual Full政策，沒有拿Trial滿額或null占用生成班額綠點。Trial Submit／Total公式／Convert等既有待答問題仍在；完整111項及300 active大檢查未完成，不因此將整Goal blocked。
