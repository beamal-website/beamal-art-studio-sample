# 共用申請者／個人檔案前置切片（2026-10-15）

本切片是課程＋時間表所需的正式人員識別前置。完成管理員申請者名冊的新增、讀取、修改、搜尋、排序、分頁及個人資料修改記錄；不是完整 Students、試堂、家庭、報名或付款流程完成。完整 Goal 與 111 項 Notion 驗收仍進行中。

## 來源及對齊界限

- Notion 主文與 111 列登記表沿用 [來源快照](notion-requirements-source.md)、[核心覆蓋](notion-coverage-core.md)及[操作覆蓋](notion-coverage-operations.md)。Applicant／Student Profile 與登入、報名、付款分開；`Convert to Student` 必須是明確動作，不能由 Paid、Confirm Request 或修改日期自動推導。
- Chrome 本輪實際查看 SchoolTracs `Students` 空清單及 `Create` 空白表格；只讀取欄位後按 Cancel，沒有在來源新增或保存學生。來源網址為 `https://web.schooltracs.com/v4/web/students?b=2&d=2026-10-14&o=yausiuhei07`。畫面證據在本機 `/tmp/schooltracs-create-student-fields-20261015.png`。
- 來源可見欄位：Display name、Student no.（停用）、Citizen ID、First／Last／Full／Local name、Gender、Date of birth、Email、Receive promotional email、Phone／Mobile、Address／District、兩位 Contact 的 Name／Phone／Email、School／Level、Occupation、Enrollment／Quit date、Detail／Remark／Bill name；另見停用的 Membership／Since／Valid through 及 PNG／JPG 頭像入口。
- 來源清單有 Normal、Search、Advanced search、Manage columns、Export／Import／Create，以及 Journals／Assessments／Cases／Notices 子頁入口。這些入口的完整效果、來源保存、學號產生、頭像及會員流程本輪未測，不標示一模一樣或已完成。
- Beamal 保留奶白／綠色風格及原圖片。已接入上述基本個人及聯絡欄位，另有 Notion 的家長／WhatsApp／推薦人；School／Level／District／Gender 目前可填文字，尚無來源選單目錄。來源推廣預設 Yes；Beamal 新資料預設空白，只有管理員明確選擇後才保存 Yes／No，避免虛構既有同意。
- 學號、會員、頭像、進階篩選、動態欄位、匯入／匯出及子頁仍待盤點。不能自動把涉及 300 學生資料搬入的匯入或核心資料動作歸類 minor。

## 已完成的有限功能

1. 每個人由共用服務產生固定 UUID；改名、相同電話、相同姓名均不合併人物。Applicant／Student 是名冊分類，不是登入角色。
2. `POST /api/people` 只建立 Applicant；管理員可讀取及修改已存在的 Student 檔案，後者目前以隔離測試資料驗證，未提供正式 Student 建立途徑。
3. 列表在服務端按分類、文字、名稱／建立時間、升降排序及頁碼取得資料，每頁最多 100 筆。文字搜尋以字面內容比對，不將 `%`／`_` 當搜尋萬用符號；介面每頁 25 筆。
4. 個人資料與完整版本快照、管理員名稱及修改時間在同一次資料庫操作保存。開啟表格時固定版本；他人先修改會拒絕舊版本覆寫，保留草稿及清楚提示。重送相同操作不會重複建立或重複記錄。
5. 三個日期可留空，推廣選擇可為空白／是／否；沒有提供的資料顯示 `—`，年齡按生日計算，不補假電話、假零、假課包。3–18 歲是最後驗收資料規模，沒有寫死成拒絕其他年齡的輸入政策。
6. Enrollment date／Quit date 是明示的手動檔案日期；修改它們不佔座、不入班、不付款、不 Convert、不啟用登入。
7. 目前全部 People 讀寫限 Admin；Teacher 即使有課程查看授權、Student 即使可登入，亦不能讀取整校人物資料。尚未建立老師負責學生／申請與家庭關係，故不能把本輪拒讀當完整 R-01／Family 權限完成。
8. 私人 People 資料只放目前身份的記憶快取；不複製至舊 `db.studentProfiles`／`db.leads` 或 localStorage。登出、身份／權限變更、目前請求遭拒及晚到回覆均有隔離。現有背景更新每五秒核對，不宣稱跨裝置即時推送完成。

## 必須等使用者決定的政策

已提出且仍等答覆：舊學生或電話直接報名、沒有試堂／付款申請的人，Admin 能否直接建立正式學生／手動 Convert，還是必須先有已確認報名意向或 Confirm Request？已確定這只改名冊，不能當成 Paid、Enrollment 或 Login；但普遍轉換資格尚未明確。

因此本切片不顯示 Convert 動作，`POST /api/people/:id/convert` 仍是 404，拒絕從任意 body 寫入 `kind`／`studentNumber`。純介面模組內的未接入轉換模板不算已提供功能。時間過去不代表使用者已選擇；有關流程保持待決，其他獨立工作可繼續。

## 獨立驗證及重要修正

- 真正隔離 HTTP People 測試 7／7：Admin 限權、非法欄位／日期／電郵／版本、相同資料重送、版本衝突、交易與修改記錄失敗回滾、重開資料庫、列表搜尋排序及 300 筆 Applicant 分頁。**300 Applicant 只是隔離資料測試，並非 300 active Students 或全系統效能通過。**
- SDK 與 public-flow 測試覆蓋正式入口、新增／修改、相同人物 ID、取消、舊版草稿、重送、身份切換、Back、搜尋分頁及私人資料清理；純 UI 15 項覆蓋中英文、欄位、空值、生日及安全編碼。沒有以純函式或模擬 DOM 代替以下真瀏覽器結果。
- 獨立審查先重現再驗修正：晚到 v2 保存回覆不覆蓋已讀到的 v3；目前 403 即使輸入框有焦點亦立即清除私人名冊、歷史和草稿；已提交搜尋可更新並恢復焦點，未提交文字不被背景更新破壞。
- 真畫面另發現切換分類時短暫用舊清單顯示 0。新增分類／搜尋／頁碼／排序四個 public-flow 回歸，修正前 4／4 失敗，修正後 4／4 通過。現在畫面在新查詢讀取前已顯示 Loading 並隱藏舊列、舊人數與舊錯誤；相同查詢的背景更新保留獲准資料。
- 最後新增上述四項前，曾完整 420／420、0 fail／skip／cancel、29.990 秒，隨後 build 2.85 秒成功。這是較早的通過紀錄；最後修正後結果另於下節記錄，不以此舊結果替代。

## 真正本機畫面證據

- Admin 在 `http://localhost:5180` 建立明確虛構 `GUI 驗收申請者 20261015`，生日 `2018-10-16`、兩位虛構聯絡人及 `.invalid` 電郵；保存後分類仍 Applicant、生日年齡為 7、空日期／推廣仍空白，版本 1 與建立管理員／香港時間可見。
- 修改名稱與第二聯絡人、推廣明選 No，確認版本 2 及建立／修改兩筆歷史。重載與第二個 Admin 分頁讀到同一人物 ID 和版本 2；取消修改姓名及手機備註草稿均未保存，焦點返回 Edit 按鈕。Student 清單仍 0，Applicant 清單／文字搜尋取得該記錄。
- 真正 Teacher 的 `127.0.0.1:5180` 既有登入直接開同一 UUID，顯示 `This account is not authorized to view this profile.`；只有 Timetable／Courses／Fees 導覽，沒有人物／聯絡資料。未用憑證檔建立新登入。
- 桌面實際寬度 1121、手機實際 390×844；中英文檔案與編輯表格已查看。document scrollWidth 等於 clientWidth，沒有頁面橫向溢出；手機編輯表格可捲到備註，Save／Cancel 固定可見。Shift+Tab 留在表格、Escape 取消並返回 Edit；英文 Cancel 實按。另補驗中文手機名冊：資料表區宽357、scrollWidth1100、overflowX auto，只有表格內部橫向捲動，整頁仍390。手機覆寫最後已 reset。
- 截圖均為本機、在專案外：`/tmp/beamal-people-profile-desktop-20261015.png`、`/tmp/beamal-people-directory-mobile-zh-20261015.png`、`/tmp/beamal-people-editor-mobile-zh-20261015.png`、`/tmp/beamal-people-editor-mobile-en-20261015.png`、`/tmp/beamal-people-profile-mobile-en-20261015.png`。
- 本輪是 CUA 提供的實際瀏覽器操作；偶發控制命令 timeout 後重新觀察畫面再繼續，沒有改用隱藏頁面狀態、直接瀏覽器 API 寫入或外部自動化。真正來源網站未新增學生。

## 尚未完成與下一步

- 正式手動 Convert／直接 Student 建立政策、Student no.、Family Login／孩子切換／啟用、老師負責人物範圍及人員生命週期仍缺。
- Trial Request、Confirm Request、Confirm Payment、Order、Receipt、Enrollment、Student Session、三配額、Attendance／剩餘堂數與通知仍缺。這是必要主流程，不列 minor；檔案修改歷史不能冒充試堂、課務、付款或家庭歷史。
- 需接正式人物 ID 到課程＋時間表的學生名單／名額、逐學生狀態和報名資料，再按使用者次序推進其他模組。此檢查點不代表 Courses／Timetable 整頁已過關。
- 4 老師／300 active 學生／6 課／3–18 歲的完整大檢查、多人競爭／失敗、全角色及真正大資料瀏覽器流暢度尚未執行。不處理本輪之外的外部正式部署、SEO 或 iOS；People 使用既有共享 API／資料庫，為未來共用保留邊界。

## 最後整體驗證

- 最後程式／測試凍結後依序執行 `npm test --prefix sample`：**424／424 通過，0 fail／skip／cancel，42.371 秒，exit 0**；隨後 `npm run build --prefix sample`：**2.28 秒成功，exit 0**。完整紀錄位於 `/tmp/beamal-people-full-test-final.log`、`/tmp/beamal-people-final-build-after-loading.log`。沒有把針對性重跑拼成全套。
- 重新載入最後 dist 後，真正從 Student 切 Applicants 的第一畫面顯示「正在載入名冊…」，舊 0 人數不再出現；讀完後顯示 1 筆虛構 Applicant。四類 pending 查詢的完整首幀行為另有上述獨立回歸，未宣稱真瀏覽器重做全部四類慢回覆。
- 在人物頁開編輯、填未保存名稱後按瀏覽器 Back，返回 Applicant 名冊，表格關閉、原已保存名稱保留；重新開人物仍版本 2。這個證據只涵蓋未按 Save 的返回，不宣稱 Back 能撤回已在服務完成的寫入。
- 最後頁面 URL 為 `/account/people/8898e41a-b0be-4f6f-af1b-3fb015a26a4f`、title `Beamal Art Studio`，有完整人物內容、沒有 framework overlay，`dev.logs` 的 warn／error 清單為空。桌面恢復 1121／scrollWidth 1121，表格已關閉；主預覽留開。第二 Admin／Teacher 測試分頁已關閉，Chrome 來源分頁留在原 Student 清單。
- 以完整測試、打包、獨立審查及真畫面界限判斷，本有限 Applicant／People 前置切片無剩餘已發現的必修問題；整頁、Student 建立與 Convert 政策及完整 Notion／300 active 系統驗收仍未完成。
