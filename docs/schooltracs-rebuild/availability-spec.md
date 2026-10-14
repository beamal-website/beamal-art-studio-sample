# Overall Available Slots：共用管理及公開投影

制定：2026-10-15，實作前規格。本片按使用者既定課程＋時間表優先次序，承接正式 Courses、Scheduling Resources、People 和範圍權限；完整 Goal 不縮減。Notion 主文本日重新 fetch，最後編輯仍為2026-10-11T03:20:26.217Z。

## 目標與已確認來源

- [§3.1](notion-requirements-source.md#31-available-slot-配置-)：正式 Overall Slot 有課程／班次、日期時間、試堂／調課资格及 Total／Trial／Rescheduling 三種容量。Class Capacity 與配額分開；Personal Slots 尚未確認，不納入。
- [§13.1–13.4](notion-requirements-source.md#十三公开课程时段展示与后台权限pdf-第-4-页讨论中)：公開 Course Details 從同一正式資料源讀取，預設公開 Trial；Public Visibility 只改顯示／隱藏，不能改名稱、時間、容量、資格。Trial 配額滿預設隱藏；開啟 Show Fully Booked 後顯示 Full。公開預設7天、最大30；最短可選日數尚未定。本片只提供已確認的7天窗口，後續補可配置範圍。
- 老師只見自己／明確獲授權的資料；Admin 管理全部。Ordinary Teacher 的 Slot編輯與Public設定授權細則尚未定，本片保持只讀，不能當作 R-02／R-03 全部完成。

## 本片完整路徑與保留缺口

Admin 在 Timetable 或 Course Details 新增／修改 Overall Slot → 同一固定Slot ID 在內部課表顯示 → 未登入訪客從公開課程目錄進入 Course Details，按同一ID及7天資料顯示 → Admin設定公開／隱藏，公開頁重讀反映而內部內容不改。

這不是 Trial Submit／Reservation交易／Enrollment 完成。Total 的合算公式及公開Trial表格必填規則已向使用者提出具體選項，仍待答覆；直接 Student／Convert 問題亦仍待決。不能默認任一容量公式、全部欄位可選或指定必填。公開表格尚未開放時清楚說明，shared 模式不得繼續使用舊 Join／Payment 示範當正式報名。

## 資料及 API 合約

`available_slots` 為獨立實體，不借用schedule ID或legacy bookings。每筆固定UUID、版本、建立／更新時間及Admin修改記錄。

- 獨立時段：`courseId,date,time,duration,teacherIds,roomIds`，使用正式課程／資源。至少選一名老師，才能識別此時段的相關老師；課室可留空。不建立正式ClassSession或StudentSession。
- 可選單堂關聯：`scheduleId,sequence`，以穩定單堂識別關聯。關聯時課程、實際日期／時間／老師／課室由 `scheduleOccurrence` 讀取，不能另存一份可以漂移的公開內容；缺失／取消／刪除的來源不公開且不可新預約。內部看得到明確不可用原因，保留原Slot ID。來源更新會使投影revision改變。
- 配置：`totalCapacity,trialCapacity,reschedulingCapacity` 為非負安全整數，`trialEnabled,reschedulingEnabled,active` boolean；啟用某類時該類容量須大於0。不自行限定兩類配置值總和，也不推定正式班學生的扣額公式。
- 公開：`publicVisibility:'default'|'show'|'hide'`；default只公開啟用Trial的active Slot，show可以明確公開其他類型，hide不公開。全域Public設定 `showFullTrialSlots:false,showReschedulingSlots:false`，版本初值0；本片公開窗口固定7天。
- 可保存 `excludedStudentIds`（正式Student ID），只由Admin讀改；兩Contact不等於家庭授權。Teacher／public DTO 不洩露排除人物、內部Remark或管理快照。排除規則的最終預約校驗待Rescheduling引擎。
- `remark` 僅内部文字，不出現在public DTO。Teacher只讀本人的／明確授權Slot，不能因其能看到某course就推定該course全校Slot可讀。
- 配額使用由獨立Reservation記錄讀取（本片沒有建立預約的API）。新Slot沒有預約為已知0；Trial／Rescheduling使用數可分開讀取，Total合算未知顯示null，不報假0或假班內人數。隔離fixture只用於投影Full測試，不冒充訪客Submission。
- 有既有Reservation時，不准無明確改期政策下換課程、時間、單堂或移除負責老師／停用；不准把該類容量改到已占用數以下。改公開顯示不釋位、改remark不釋位。

API：

| 入口 | 合約 |
|---|---|
| `GET /api/available-slots?from=&to=&since=&courseId=` | 登入Admin／Teacher，界定日期範圍最多366天（必填from/to）；回 `{slots,revision}` 或 `{unchanged:true,revision}`。Teacher按真正範圍過濾。 |
| `GET /api/available-slots/:id` | 同一範圍檢查後 `{slot}`；未獲准403。 |
| `POST /api/available-slots` | Admin＋Origin／CSRF＋idempotency，201 `{slot}`。 |
| `PATCH /api/available-slots/:id` | Admin全配置＋開表時 `version`，200 `{slot}`；舊版409。 |
| `GET /api/availability-public-settings` | Admin讀 `{settings}`；含version與固定 `rangeDays:7`。 |
| `PATCH /api/availability-public-settings` | Admin＋目前version（初始0）、两個boolean；僅改展示，200 `{settings}`。 |
| `GET /api/public/courses` | 真匿名公開目錄，`{courses,revision}`。只公開有依Visibility規則發布Slot的未刪課程；Full篩選不令Course本身消失。Course保存本身不自動Publish。 |
| `GET /api/public/courses/:id?from=` | 真匿名，`{course,slots,from,to,rangeDays:7,revision}`。只從正式Slot投影；不存在／未公開course404。from預設香港當日，7天邊界不溢出有效年份。 |

內部Slot DTO：固定元資料、上述配置及有效時段／資源顯示名稱，`sourceAvailable`、明確 `unavailableReason`、`trialReserved`、`reschedulingReserved`、`totalReserved:null`、`trialStatus`。linked Slot 可顯示 `classCapacity`，`classOccupied:null` 直到正式Enrollment接入；不代填班額。

Public Course DTO只含 `id,courseName,category,level`，不返回私有教材、內部費用、操作者或未提供的description／age／圖片。Public Slot DTO只含固定ID、courseId、日期／時間／時長、公開老師及課室顯示名稱、兩類资格／配置值與Trial／Rescheduling名額摘要；不傳remark、exclusions、owner、history、Person或Login資料。尚未有正式課程介紹／圖片發布編輯，不自行補素材。原Beamal圖片保留。

## 實作分工與位置

1. Backend worker：`sample/server/available-slots.mjs`、app/store/access-control接線及新的真HTTP測試；更新benchmark module-copy依賴。只改此域，不讀真`.data`。
2. Pure UI worker：`sample/client/availability-ui.js`、純UI測試及`.availability-*`新增CSS；不碰src／SDK／backend。
3. Root：SDK、src正式internal／public cache與路由、課表／Course入口、公開展示／設定及最後整合。共享private與匿名public資料分開，身份／權限改變及晚到回覆有隔離。
4. 獨立 QA：public-flow／SDK／服務審查；Root獨占瀏覽器，最後真Admin／Teacher／anonymous、兩分頁與手機中英文驗收。

## 風格、指令及界線

沿用Vite／原生JS、ES modules、`t`＋`esc`（雙語和輸出編碼）、固定開表版本及穩定operation key。例：`saveSlot(profile,current,key)` PATCH只用`current.version`，不拿背景新版本覆寫草稿。

- 指定服務：`node --test sample/server/tests/available-slots.test.mjs`。
- 指定UI／SDK／主流程：`node --test sample/tests/availability-ui.test.mjs sample/tests/api-client.test.mjs sample/tests/flows.test.mjs`。
- 最後依序：`npm test --prefix sample` → `npm run build --prefix sample`，不平行。
- 本機共用：`node server/cli.mjs`（cwd sample）；沿用已確認正在運行服務，換backend前核對實際handle／PID，不能只因觀察timeout重啟。
- Always：TDD先證Fail再修、同資料庫交易、角色及scope、private/public白名單、版本／重送、保留草稿、桌面／390雙語。
- Pending：Total合算／Trial必填、公眾range最短、普通老師編輯授權、取消／改期／轉學生／Family等明示政策。既有自動獨立驗收前進授權適用；不另要求每次schemas／實作選擇批准。
- Never：main操作、替換Beamal圖、讀／stage真憑證、外部業務寫入、假數據當真人、把介面或窄測試當整111／300active驗收。

## 驗收門檻

真HTTP須驗CRUD同ID、多人衝突／重送、非法欄位、日期／resource／course狀態、無權Teacher／Student／anonymous寫入、按教師範圍、撤權及資料庫重開。PUBLIC白名單、Visibility不改內部事實、defaultTrial／hide／showRescheduling／Full設定、linked來源移日／取消／Undo更新同ID、费用／Schedule不被Slot寫入污染均要可證明。私有資料不能從public端點、HTML或舊快取漏出。

真瀏覽器走完整管理→internal課表→匿名公開Course Details→改Visibility→重開的路徑，保存截圖；確認loading／error不是假空，取消／Back不保存、鍵盤留表格、底部按鈕、無頁面橫向溢出。未做的TrialSubmit、Total公式、Teacheredit、完整公開range、300active及111全系統仍列缺口，不能標為完成。
