# 單堂內部備忘真保存：來源與最小合約（2026-10-16）

只讀研究；未修改 repo／DB、未開服務／瀏覽器、未跑測試／build／Git。本輪重讀本機 Notion 快照、原稿第3頁、現有 UI/host/tests；不是聲稱重新讀取線上 Notion 或 SchoolTracs。

## 來源已確認

- `docs/schooltracs-rebuild/notion-requirements-source.md:475–480` §17.2.4：Admin 可在日期或具體 Class Slot 輸入純文字；普通 Teacher 可在自己獲授權範圍建立／查看。Student/Parent 不提供、不展示。自由文字，不能因寫 Sick/Absent 而更新假期、出席或待辦；與學生行 Remark/Sticker 分開。建議保內容、關聯日期／Slot、作者及修改時間；權限及多人衝突機制待技術設計。
- 同檔 `:504–508` EX-24：Admin/Teacher 進圖示→輸入→保存；小型提示，展開讀／改全文，不撐壞課表；學生／家長不見；不更新正式業務狀態。
- `notion-requirements-register-source.json:791–798` TM-01，Notion ID `3f5936c332a98119b088fdb35e5f883c`；`:799–806` TM-02，ID `3f5936c332a9816bb3f4ee74c60540f7`。均標「對話補充／已確認」，不是原 PDF 現成獨立日期備忘。
- `ULTIMATE-GOAL-PROMPT.md:212` 要保固定課次身份／歷史／例外；`:220` 日期／班次純文字不改出席、假期、名額、待辦，內部備忘不傳學生／匿名。
- 原稿 `/Users/yausiuhei/Downloads/Beamal web & app rough brainstorm remark (eileen.pdf` 第3頁本輪完整目視：學生行有 Remarks→Add，與 Attendance 分欄，手寫要求學生特別 Remark 可在 TT 展示。這只能證學生課次備註，不能用來聲稱班次／日期內部 Note 與它同源。PDF SHA256 `ffffe3efea424f501c13172e7ea9d80056a041158f3d4ed1e969de64b5d3a55e`，本輪重核一致。
- `timetable-notes-ui-checkpoint-20261015.md:7–10` 保留2026-10-15既有 SchoolTracs 觀察：Remark/Details/More info，More info 有學生 App 顯示說明；未觀察到日期獨立入口，不能據此把 Remark 當單堂內部 Note。

## 現況及不可混用的來源

| 資料 | 粒度／受眾 | 目前來源 |
|---|---|---|
| Date note | 某日；正式共享範圍尚未定 | `src.js:1802–1808,1832` 只讓可見授權日期輸入草稿，註解明確不授 shared write/read 同事備忘 |
| Lesson note（今片） | 指定 `(scheduleId, sequence)`，當前實際日期／時間；內部 | `src.js:1810–1816,1833–1841` 精確課次，`1879` Save inert；`timetable-notes-ui.js` 只有純 renderer/validation；尚無獨立 server/SDK Note service |
| Schedule remark/detail/moreInfo | 排課系列／例外已有欄位；moreInfo 有學生受眾線索 | 不是此新內部 Note，不能拿 schedule save 偷寫，不能以日期當唯一課次身份 |
| Student Remark/Sticker/showRemark | 指定學生＋指定學生課次 | `student_sessions`；不能作全堂備忘或要求 Paid 才可新增班次備忘 |
| Available Slot remark | 可預約時段的另一個管理欄位 | `available-slots.mjs:11,34,74`，並非 formal occurrence Note，也不可傳匿名 |

現有 UI 上限2,000字、保原文換行、不收空白；Edit→Review→Back保選取／捲動；取消回同課堂再回原 Course 月份。這是既有工程/UI合約（`timetable-notes-ui.test.mjs:16–21`、`flows.test.mjs:3570–3611`），本輪僅讀測試，沒有把舊通過數當新驗收。

## 最小單堂保存提案（技術設計，並非原稿逐欄指定）

1. 新獨立持久來源，固定 `(scheduleId, positive integer sequence)`；由 server 讀 canonical effective occurrence 取得 course/date/time/duration/sourceVersion。路徑可為 `GET/PATCH /api/schedules/:encodedId/occurrences/:sequence/note`。客戶端不可傳老師名、日期、courseId 來決定目標；不因名稱相同、日期相同借另一筆。
2. 此片可採每堂一份共享可修改純文字（最貼現有單 textarea）；這是最小資料模型提案，不聲稱原稿已指定「每人一份／一堂多則／討論串」。若需多則留言不能偷偷以此冒充。
3. GET 建議 `{source:{scheduleId,sequence,courseId,date,time,duration,sourceVersion},note:null|{text,version,createdAt,updatedAt,authorName?,editorName?},capabilities:{edit:boolean}}`。已成功讀取但未建 record 的 `null`，與 loading/error/未授權不同，不造 version1／作者／時間／歷史。既有文字與作者資料不得從排課 remark 或當前登入人補作舊作者。
4. PATCH 明確白名單 `{version,sourceVersion,text}`：新建無record版本0；既有正整數版本；現有原文2,000字規則。先本次真 actor 與目標／寫權校驗，再 CAS；版本或 occurrence source 變更409且保草稿重開，不全量覆寫其他排課。已有日期／時間變更時，舊草稿不自動換標題後保存；持久 Note 以固定課次身份跟隨 canonical occurrence（Goal212），不複製往同系列其他堂。
5. 原子交易保存文字、版本、作者／編輯者及時間／必要 audit；穩定 operation key 讓 lost-ACK 重試同一版本不重複建立。快取回覆前仍重新驗當前角色／目標授權，不能讓撤權者 replay 舊私密文字。GET不寫；Student/anon連直接 route/額外欄位/錯ID都不得讀寫。
6. 成功 ACK 必須驗 exact schedule+sequence、canonical source、遞增 note version及原文一致，再更新同堂讀來源並回同名冊／課堂；同一身份背景 poll 不重畫正在輸入的 textarea。晚 ACK／換身份／換路由不能重開原私人視窗或錯報成功。正常網絡錯保原文／key可重試，409明確提示最新來源。
7. TT 同堂顯小 Note 提示並可開讀／改全文；不把全文長行塞格子。只有內部授權 read DTO/入口包含；public `/public/courses`、`/public/timetable`、trial public snapshots、Student timetable/profile/orders 等投影須保持不含文字、作者、Note ID/旗標。保存不改 schedule資料、StudentSession出席、StaffLeave、To-do、付款、quota或佔位／Full。
8. Date note 本片仍只草稿/最後 disabled，不默默變全中心日記。其正式 audience（私人／本人教師日曆／全中心／指定老師）、同日合併與日期跨視圖尚待定，仍是 TM-01 核心未完，不能列 minor。

## 角色界線：已確認能力與尚待 mapping

- **明確**：Admin 和普通 Teacher 都有 Note 功能；Teacher 不能見未授權資料；學生／家長／匿名沒有內部 Note。不能拿「老師不能改排課」取消已確認的獨立備忘功能。
- **現有實作事實**：`access-control.mjs:101–105` 的 `scopeFor().permits` 包含本人 link及 `scoped_read_grants`（課程／老師／課室／課次）唯讀授權；`:132–135` 另有本人 stable resource links。可看某堂 ≠ 已確認有修改他人共享 Note 權。
- **最小安全寫權提案**：Admin 或 DB explicit ownTeacherResourceIds 與該有效 occurrence.teacherIds 相交的負責 Teacher 可寫；其他已授 read grant 的 Teacher 可讀，edit=false。這能落實普通負責教師主線，但「被授唯讀看同事課」是否亦可新增／改共用 Note、是否只可改本人作者 Note、代課前後舊老師權限，來源未逐項定義，需 Root 明確技術 mapping／必要時客戶政策確認，不能直接以所有 permits 升級寫權。
- 取消／刪課保留 Note 歷史但拒新存／不對已失效 source 展示，是保資料的技術提案；恢復課堂後何人可見仍走當前授權。此片不新增 Delete Note／清空即刪除／通知功能政策。

## 給製作者／獨立驗收的結果案例

A. exact第二筆同名課程、第2堂新增真Note→重讀／重啟同文／作者時間，第一堂、別班及同名課全不變；無學生／無付款的合法班次同樣可備忘。
B. Admin＋負責 ordinaryTeacher成功；only read grant／未指派教師按明確canEdit拒寫；Student/anon direct HTTP/forgeID不洩文字。撤link／改老師在body-await和cached replay前再驗。
C. 已知無record vs loading/error嚴格分開；未知不顯「尚無備忘」；wrong schedule/seq ACK不能套first/current。
D. 新建版本0／更新1→2 CAS；兩人同版只一人成功，另一409保原文；課次移日／變老師／取消後舊source拒保存，不把Note轉到別堂。
E. lost success/200 malformed/network timeout→poll已見新Note仍原key確認；doubleclick只一write；換身份／route晚回覆不toast、不復活。
F. 原生Input/IME/Review/Back/Cancel保 raw multiline、焦點／caret／body scroll；成功精確返回課堂→原Course月份或TT範圍／入口。
G. XSS文字全部escape；source error不raw render；author/email/token不外洩。所有匿名／Student投影保存前後無Note私有變化。
H. 對照商業表與排課snapshot：出席、付款、座位、Full、補堂、老師假期、待辦完全未變；輸入『Absent／Sick』不觸發正式流程。

## Root 本輪已選定的最小技術 mapping（製作合約，以此為準）

收到 Root 明確決定：只單堂 Note；Admin／current effective 負責 Teacher 可寫；read grants只讀。這是保守工程 mapping，不冒稱原稿已逐項決定所有寫入權。日期 scope 尚未決，因此不啟用真存。

正式 route `GET/PATCH /api/schedules/:id/occurrences/:seq/note`；回覆 `{note:{scheduleId,sequence,courseId,date,time,sourceVersion,version,text,updatedAt,canWrite}}`；PATCH `{version>=0,sourceVersion>=1,text<=2000}`。`version:0` 代表已成功核對來源且尚無備忘（known empty），不代表虛構持久第一版；loading/error不得轉此結果。首次空白拒絕；已有Note可 `text:''` 清除，但遞增版本並留audit，不能當刪歷史。這個清除操作是 Root 選的最小可回溯技術行為，不是 PDF 已指定的刪除政策。

以上覆蓋本報告早前的建議 DTO／無record null／一律非空提案。之後獨立驗收按此精確合約，不把兩種設計混用。來源建議作者與修改時間；公開DTO沒有作者欄並不妨礙在私有record/audit保存真actor，不能拿當前登入姓名冒充最初作者。
