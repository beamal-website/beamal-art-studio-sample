# 員工 UI 有限驗收紀錄

日期：2026-10-15。只記錄已完成改動及證據，不修改 Goal、需求來源、範圍或完成標準；目前仍是全系統 UI 階段。

## 本輪改動

- 指定員工詳情 → 真實共用老師編輯器 → Cancel／Close／Escape，返回同一人、原詳情分頁、搜尋、焦點及位置。清單直接新增／編輯仍返回清單。
- 儲存回覆確認後，以確認的同一資源更新畫面；其後重新讀取失敗不要求重交、不丟失已確認資料。換身份、權限版本或導航後，舊返回憑證失效。
- 課程、排課、教學資源及帳戶範圍的讀取失敗傳到 Staff 狀態；Retry 真正重新讀取這些來源。首次失敗不冒充空資料；同身份更新失敗保留已授權資料。
- 背景更新保留未交表單、焦點、游標選取及捲動。未知僱傭安排、薪金、打卡不再被轉成 Part-time、零筆紀錄或假薪金狀態。
- 手機五個詳情分頁完整可見；長的登入及資料範圍分頁獨佔一行，內容可捲動、底部按鈕可操作。

## 程式驗證

- 最終 `npm test --prefix sample`：883／883，exit 0，fail／cancel／skip／todo 全 0；日誌 `/tmp/beamal-v15-final-verified-test.log`。
- 最終 `npm run build --prefix sample`：exit 0；日誌 `/tmp/beamal-v15-final-verified-build.log`。主包 811.14 kB，超過 500 kB 警告仍在，不能當成效能驗收已過。
- 另一位 Agent 的固定獨立驗收 16／16：source 5、ticket 4、read 6、typed refresh 1。日誌 `/tmp/beamal-v15-staff-independent-final-{source,ticket,read,typed}.log`。這些是 module／實際程式 VM 驗證，不冒充 GUI 或服務持久化測試。
- 原實質失敗包含返回空白、首次錯誤一直 Loading、未知僱傭／薪金、文字框焦點及游標遺失，均有失敗及修後證據。一次整合檢查另發現舊 catalog 請求的拒絕被吞；已保留原拒絕語意，且不能污染新身份，最終全套通過。
- `git diff --check` 通過；Goal／啟動文／PDF-Notion 對照三檔 SHA 與本輪開始相同。沒有 Commit 或 push。

## 真實瀏覽器及參考系統

- IAB 真本機 Admin：1280 中文、390 英文／中文、768 中文。Leo 搜尋、Teaching 分頁 → 編輯 → Cancel／Close／Escape 返回同人同分頁；搜尋和 Edit 焦點保留。390／768／1280 實際頁寬等於 viewport，沒有整頁橫溢出。
- 390 英文五分頁全部可見；薪金來源未提供時顯示 Payroll records are not available yet，沒有 No records 假結論。最後手機圖片 `/tmp/beamal-v15-staff-tabs-390-en-final.png`、`/tmp/beamal-v15-staff-tabs-390-zh-final.png`；桌面返回 `/tmp/beamal-v15-staff-return-1280-zh.png`。
- 真普通老師帳戶重新登入：Leo 仍讀到創意繪畫、水彩探索及原有 2026-10-16 13:30；薪金暫未提供，打卡確認仍停用。再切學生，Chloe 月曆載入 10-16 13:30／10-17 10:00 等課堂，未保留老師私人彈窗；最後還原 Admin。這只證明本輪角色讀取及清除，沒有跨角色寫入或全校規模驗收。
- Chrome SchoolTracs 唯讀：Staffs／Roster／Payroll；指定 Staff 的 Info／Calendar Sharing／Roster。角色、分校存取及登入設定在個人資料內。Edit 的 Close 直接返回清單、保留搜尋；Beamal 返回同人詳情是有意減少重找步驟，不能稱完全相同。未驗來源保存、邀請、日曆分享或權限效果；已還原來源 Timetable，無外部寫入。

## 仍未完成

完整員工個人欄位、Roster／Calendar Sharing／Payroll 相關頁面、假期代課、薪金／打卡的共用業務服務及其權限、跨角色寫入與恢復仍須接續。現有老師編輯器仍只保存排課資源欄位。此紀錄不宣稱整個 Staff、全 UI 或整個 Goal 已完成；其他模組及完整聯合驗收亦保留原範圍。

首次／更新讀取失敗、Save ACK 後失敗的控制情境本輪只由程式及 VM 覆蓋，未故意中斷使用者共用服務；真 GUI 不冒充已測到這些故障。

## 同日補充：薪酬及打卡 UI

本節只補記其後完成的介面工作及證據；上面的歷史驗收保留。Goal、來源優先次序、範圍與完成標準均沒有再修改。

### 已完成的介面

- 管理員在 Staff 內使用 Staff／Clock records／Payroll 三個入口；薪酬設定由指定員工的 Salary 分頁進入，不放在 Timetable。
- 個人薪酬設定有時薪／月薪、對應金額、備註、核對及返回。切換方式會保留兩邊草稿；取消回到同一人、同一詳情分頁及搜尋，不要求重找。
- 每月薪酬有月份、老師、狀態及搜尋；Scheduled、Actual、認可遲到、已批 OT、扣減與實發分開。未知保持未知，確認的零值才顯示零；歷史記錄不借用現行薪酬設定補造舊薪酬類型。
- 薪酬記錄 → 調整 → 核對 → 返回修改／原記錄的完整 UI 路徑已接入。核對不自行計算或更改實發金額；保存、批核、產生及下載 Payslip 仍停用。
- 打卡使用獨立事件清單、日期／老師／類型／地點篩選及個別詳情，不將 In／Out 配對或補造下班時間及工時。日期、時間、秒數及來源時區以易讀方式顯示；無效時間、缺少時區分別明示未知，不按裝置時區擅自換算。
- 管理員打卡設定有工作室、中心點、課前／課後窗口及兩個獨立的外勤照片／原因要求；未設定不當作關閉。表單 → 核對 → 返回保留草稿，最終保存停用。
- 普通老師共用同一組 UI 模組，只能讀本人且明確可見的薪酬及本人打卡，沒有管理員設定／調整入口。換身份、權限或離開共享來源會清除私人對話框及返回狀態。
- 老師工作台在手機／平板將六個分頁排成兩行，打卡、假期及薪酬直接可見；Payroll 不再重複顯示頁名，Clock records 在既有 Clock 頁下使用次級標題。

### 最終程式驗證

- `npm test --prefix sample`：937／937，exit 0；fail／cancel／skip／todo 全 0；`/tmp/beamal-v16-final-verified-test.log`。最後一次在手機分頁樣式修正後完成。
- `npm run build --prefix sample`：exit 0；`/tmp/beamal-v16-final-verified-build.log`。主包 849.62 kB（gzip 261.19 kB），超過 500 kB 警告仍在，不能當成效能已驗收。
- 獨立 Agent 驗收：純模組邊界 18／18（`/tmp/beamal-v16-staff-independent-module-final-verified.log`）；真實 HTML／FormData／整合 host 4／4（`/tmp/beamal-v16-staff-independent-host-final.log`）。這些不冒充瀏覽器、資料庫保存或多人同步證據。
- 薪酬類型原生 input／change 重繪、返回焦點／游標、打卡時間顯示均有修前失敗及修後通過的證據。打卡時間新增四組用例，最後該模組 27／27（`/tmp/beamal-v16-attendance-clock-display-green.log`）。
- 另一位 Agent 只讀核對受控測試頁：使用正式兩個純 UI 模組，明示 fictional records／no saving，無 API、storage、GPS 或資料庫操作；換角色會清草稿。

### 真瀏覽器證據與界線

- 真本機 Admin：1280 中文、390 英文及 768 英文完成 Leo 薪酬表單的時薪／月薪切換、核對、返回、取消；輸入及原 Salary 分頁保留，最終保存停用。圖片 `/tmp/beamal-v16-salary-review-1280-zh.png`、`/tmp/beamal-v16-salary-review-390-en.png`。
- 真本機 Admin 390 英文打卡設定：兩個外勤要求分開選擇、核對、返回、取消；頁寬 390、彈窗及底部操作在邊界內。所填工作室、經緯度及分鐘只屬未提交的驗收草稿，沒有保存或採集位置。
- 真普通老師 Leo：390 英文 Payroll 只有一個頁標題、六個分頁完整可見、頁寬 390；768 英文 Clock 的 Clock records 使用次級標題，六個分頁及頁寬 768 正常。沒有管理員老師篩選或設定入口。最後已重新登入管理員；本輪沒有重新驗學生端或跨角色業務寫入。
- 真共享來源尚未提供 Payroll records／獨立 Clock events，所以真帳戶只能驗對應的誠實未提供狀態、表單與返回。不能把下述受控有記錄畫面當作來源接通。
- 受控測試頁 `sample/tests/fixtures/staff-hr-review.html` 以固定且清楚標示的 fictional records 驗有記錄畫面：Payroll 真零與未知、調整核對後返回保留 30 分鐘及備註、取消返回 Leo 原記錄、老師只見本人；Clock 三筆獨立事件、100 m 正常／150 m 外勤、未提供／錯誤／載入／空資料／有記錄五種畫面。390 中文頁不橫溢出；1280 中文詳情日期、秒數、時區及原因完整。圖片 `/tmp/beamal-v16-payroll-adjustments-fixture-390-en.png`、`/tmp/beamal-v16-clock-fixture-390-zh.png`、`/tmp/beamal-v16-clock-event-fixture-1280-zh.png`。測試分頁已關閉。
- 本輪沒有新操作 Chrome SchoolTracs；參考界線沿用上節已有的唯讀觀察，Payroll／Clock 細化以既有 Notion 需求快照為據，不稱為新核對或完全相同。

薪酬及打卡的表單、清單、詳情與核對 UI 已補上；真共享服務、保存／批核／Payslip、照片存取及正式權限仍未接通。完整員工個人欄位、假期代課、Roster／Calendar Sharing 等 UI 及其他模組繼續保留，不能因本節程式測試通過便宣稱整個 Staff、全 UI 或 Goal 已完成。本輪沒有更改業務資料、Commit 或 push。

## 同日補充：指定老師資料、日曆分享及排班返回

本節是有限進度及證據，沒有改 Goal、來源優先次序或完成標準。

- 指定老師 Contact 現有獨立的個人資料表單：全名、本地姓名、身份證號碼、性別、聯絡電郵、電話、手提電話、職位、僱傭安排、入職日期、詳細資料及備註。Staff number 只讀；顯示名稱、代表顏色、排課啟用狀態沿用原本真正的排課資源編輯器。登入及資料權限仍在指定老師的獨立分頁，不借聯絡電郵更改登入帳戶。
- 表單可核對、返回修改及取消；尚未接通個人資料服務，最終保存停用。未知來源可準備空白草稿，不能當作已載入或已保存的正式個人資料。新頁不拿 fixture、登入電郵或資源職位補造這些欄位。
- Calendar sharing 放在指定老師內；分享狀態、連結與獨立來源未提供時如實顯示。設定可核對及返回，但保存停用，沒有產生 token、發布日曆、邀請或外部訂閱。已有且已啟用的安全來源連結才可經真正 clipboard callback 複製；callback 失敗不顯成功，原始錯誤不外露。
- 離開再回同一個 Profile／分頁、來源連結改變再還原、換身份／權限或來源失效後，舊複製回覆不能復活。這些有控制測試；真共享服務未提供日曆連結，不能稱已實測真來源的複製或分享。
- 背景 Staff 清單更新但 HR 表單可見資料不變時，保留原有輸入框，避免打斷輸入；可見老師資料確有變更時才重畫並還原焦點、選取及位置。
- 手機七個詳情分頁完整排列；最後單數分頁佔整行。日曆分享不重複老師姓名或未知狀態提示。

### 實際畫面與參考界線

- 真本機 Admin Leo：Roster 選 2026-11-06，09:30–12:00 及 13:00–17:30，設定每週至 11-27，核對、返回及取消均保留對應草稿或原老師／月份。沒有提交排班保存。390 中文核對圖 `/tmp/beamal-v20-roster-review-390-zh.png`。
- 真本機 Admin Leo：1280 中文輸入個人資料，核對後在 390 中文返回修改；日期、電郵、性別、僱傭安排及備註保留，取消回到同一老師 Contact。768 英文表單、1280 英文長姓名核對、390 英文 Calendar sharing／啟用核對／返回／取消均實際驗過，最終 Save 停用。390／768／1280 頁寬分別等於 viewport，彈窗及 footer 都在邊界內。
- 圖片：`/tmp/beamal-v20-personal-review-390-zh.png`、`/tmp/beamal-v20-personal-edit-768-en-final.png`、`/tmp/beamal-v20-personal-review-1280-en-final.png`、`/tmp/beamal-v20-calendar-profile-390-en-final.png`、`/tmp/beamal-v20-calendar-review-390-en-final.png`。
- Chrome 使用獨立臨時頁唯讀 Staff QA A Edit：Staff no. 停用，Gender 選項 Male／Female／Unspecified；姓名、聯絡、Detail／Remarks、分校、Role、登入及邀請在個別 Staff 內。未改值、未 Save、未邀請；臨時頁已關閉，沒有移動使用者原本的 Sales 分頁。Employment／Joined／Position 延伸不是本輪 SchoolTracs 實測欄位。
- 真本機頁面 console 樣本未見 Beamal 來源錯誤；有一筆第三方瀏覽器擴充程式的 content_script 錯誤，不能記成 console 全無錯誤。

### 程式及獨立驗收

- `npm test --prefix sample`：1049／1049，exit 0，fail／cancel／skip／todo 全 0，`/tmp/beamal-v20-final-test.log`；33.2 秒。
- `npm run build --prefix sample`：exit 0，`/tmp/beamal-v20-final-build.log`；主包 914.34 kB（gzip 279.04 kB），超過 500 kB 的警告仍在，沒有冒充效能或全部規模驗收完成。
- Profile 正式 20／20、另一位 Agent 固定獨立 8／8；Calendar sharing 正式 14／14、獨立 6／6。日誌 `/tmp/beamal-staff-profile-ui-final.log`、`/tmp/beamal-staff-profile-independent-cross-final.log`、`/tmp/beamal-calendar-sharing-ui-layout-final.log`、`/tmp/beamal-calendar-sharing-independent-green.log`。
- Root host／adapter 新用例先 5 個實質失敗、1 個原先通過，再修為 6／6；另為原生輸入被重畫、導航返回及連結改回原值的舊回覆新增修前失敗證據。另一位 Agent 以真正 HTML／FormData 的固定 10 個 host 情境原樣重跑全部通過：`/tmp/beamal-profile-sharing-independent-host-final.log`，沒有冒充真正瀏覽器或服務保存。
- Goal／啟動文／PDF-Notion 比較三檔 SHA 保持不變，沒有 Commit、push 或業務資料寫入。

其後仍需完成未覆蓋 UI、排班群組等入口，以及全員工業務服務、資料保存、真正分享、假期代課、打卡薪金、完整權限與跨角色聯合驗收。以上不代表整個 Staff、全 UI 或 Goal 完成。

### 同輪時間表修正的界線

使用者指出切換星期時欄闊不同及空白格缺少新增入口。現以固定日欄最小闊度取代按課堂內容撐闊，空白 15 分鐘格有 hover／鍵盤焦點新增提示，點選帶入該格日期及時間。真本機今週及上週七欄均量得 200 px；點 2026-10-12 09:15 帶入正確日期、時間及星期一，取消返回時間表。圖片 `/tmp/beamal-v20-timetable-cell-prefill.png`、`/tmp/beamal-v20-timetable-final-zh.png`、`/tmp/beamal-v20-timetable-overview-final-zh.png`。真 hover 滑鼠移動沒有可用的自動化 API，本輪用鍵盤焦點及原 CSS 驗入口，不冒稱已直接自動移動 mouse；既有課堂詳情、390／768 及碰撞布局的驗證見前輪日誌。
