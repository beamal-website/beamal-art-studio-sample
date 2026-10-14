# 老師可讀範圍與連續日期檢視檢查點

日期：2026-10-15。這輪完成現有共用課程與排課的 **R-01 老師可讀範圍**，並接入 **C-01 任意連續 1–14 天檢視**。這是本機測試系統的一個切片，最後整體測試、build 與最後版畫面驗收由統籌補記於文末。

## 規格依據與來源界限

本輪優先依使用者提供的 Notion Beamal v0.1 規格：[原文快照](notion-requirements-source.md)與[111 項需求來源登記](notion-requirements-register-source.json)。

- **R-01**：Admin／Manager 本身可授課，並保留全校管理範圍；普通老師預設只看自己負責或獲授權的資料。不能由 SchoolTracs 某個下拉選單的角色篩選，推論 Beamal 的 Admin 不能授課。
- **R-02**：普通老師可改 Available Slots、學生名單、Capacity、代班等的細則仍待確認。這輪老師維持唯讀；顯示或停用按鈕的控制旗標不是完整的逐項操作權限設定。
- **C-01**：Student／Parent、Teacher、Admin 可從選定日期顯示任意連續 1–14 天；1–7 天一排，8–14 天分兩排，每排最多七天，14 天為 7＋7。

SchoolTracs 已觀察 Day／Week／Month／List 及老師、課室多選；這些來源研究保留於[時間表研究](research-timetable.md)及[資源研究](research-scheduling-resources.md)。本輪的帳戶連結、三種明確授權、撤權與有界逐堂讀取是 Beamal 依 Notion 落實的契約，未在原系統逐項實測，不能標成相同權限模型。1–14 天亦是 Notion 要求，不是由原系統四個檢視選項推導而來。

## 使用者可見的效果

管理員可把已存在的登入帳戶連到正式排課老師資料，也可額外授權課程、資源或指定一堂。資源、帳戶與授課指派各保留穩定 ID；改名稱不改身份，不以同名文字自動配對。

- 老師沒有連結或授權時，課程、費用、時間表與資源清單預設為空；不再使用全校老師唯讀範圍作預設。
- 同一系列若第一堂是 A、第二堂是 B、往後是 C，A 只收到自己的獲授權堂次；不因與 B／C 共用課程便讀到整個系列。
- 已獲授權課堂上的共同老師及課室資料可供顯示；無關的第三位老師、課室或私人課程不會出現在清單。
- 撤權或把老師移出實際指派後，舊教材／附件網址亦會重新判斷權限，不能靠已知 ID、下載參數、HEAD 或部分檔案讀取繼續取得資料。
- Admin 可連結自己的授課資源，同時保留管理權。連結不建立帳戶、不發邀請、不改密碼、登入資格或 `user.role`。

現有學生的公開課程、教材可見設定、獨立教材授權、已刪課程拒絕及下載設定維持既有規則；本輪沒有把普通老師的授權套到學生身上。

## 授權契約

管理員使用 `GET /api/access-control` 讀取 `{revision, accounts, teacherLinks, grants}`。帳戶選項只含 `id`、`displayName`、`role`，不提供 email 或登入憑證。可連結的帳戶為現有 Admin 或 Teacher；學生不是本輪授課帳戶連結對象。

`PATCH /api/access-control/teacher-links/:teacherResourceId` 接收 `{version, userId}`：新連結版本為 0；`userId:null` 解除連結並保留版本紀錄。一個老師資源只連一個帳戶，同一帳戶可連多個老師資源，沒有按名字或 email 推定關係。

明確授權由 `POST /api/access-control/grants` 建立；`PATCH /api/access-control/grants/:id` 只更改 `{version, active}`，保留原授權 ID、對象與範圍：

| 種類 | 目標 | 實際讀取範圍 |
| --- | --- | --- |
| `course` | `courseId` | 該課程的課堂與相關課程資料／教材 |
| `resource` | `resourceId` | 實際指派包含該老師或課室資源的堂次，以及相關顯示資料 |
| `occurrence` | `scheduleId`＋`sequence` | 同一系列內指定的固定堂次；移日期或時間不改此堂次身份 |

**可讀課程名稱、費用或教材不反向授權該課程的全部課堂。** 全課程堂次授權必須有明確的 `course` grant；由單堂或資源取得的相關課程資料不能變成全系列權限。

同一帳戶、種類及目標的重複授權有 `GRANT_EXISTS` 保護；版本不符拒絕覆寫。管理變動必須經服務端 Admin、Origin 與 CSRF 檢查，授權、稽核及重試回覆在同一 SQLite 交易保存。交易即是整批操作一起成功或一起取消；失敗不會只留下半個授權。操作識別碼讓丟失回覆後原樣重試仍回同一筆結果，資料庫重開後亦保留。

同類資源名稱重複保護、停用保留、授權版本與上述重試／還原契約是 Beamal 的保護選擇，不當作 SchoolTracs 已驗證規則。

## 共用服務的資料範圍

程式依據：[access-control.mjs](../../sample/server/access-control.mjs)、[app.mjs](../../sample/server/app.mjs)、[store.mjs](../../sample/server/store.mjs)、[materials.mjs](../../sample/server/materials.mjs)。

| 入口 | 普通老師的服務端限制 |
| --- | --- |
| Courses／Catalog | 只回傳實際／歷史獲授權堂次所關聯或明確授權的課程；未配對的舊老師文字不能證明身份 |
| Fees | 只回傳獲授權課程的費用；共用費用的 `courseIds` 也裁至可讀課程，避免由關聯 ID 發現其他課程 |
| Schedules | 按實際逐堂 `teacherIds`／`roomIds`、課程 grant 或指定堂次 grant 判斷；不以父系列老師文字或課程名稱判斷 |
| Resources | 只回傳自己的已連結資源、明確資源 grant、獲授權堂次所需的共同老師／課室 |
| Materials | 每次讀清單或直接 ID 都重新判斷目前課程範圍 |
| Attachments | 每次 GET、HEAD、Range、inline／download 都先取得目前可讀教材；撤權後回 404，檔案本身及保留歷史不被刪除 |

Teacher 保持唯讀；即使獲授權課程，仍不能偽造請求新增／修改課程、排課、資源、教材或授權。Admin 仍使用原本完整資料及修改契約；學生不取得全校排課，正式 Enrollment 未接前不假造已入班資料。

### 老師排課回覆只含已授權堂次

Teacher 必須使用 `GET /api/schedules?from=YYYY-MM-DD&to=YYYY-MM-DD`，兩端含在內、最多 366 天；日期無效或缺少範圍回 400。這個服務查詢上限是有界讀取保護，**不把 C-01 的 UI 天數上限改成 366**。

正常回覆為 `{revision, readScope:'occurrences', occurrences:[...]}`，同版本回覆為 `{revision, readScope:'occurrences', unchanged:true}`。每筆 occurrence 保留 `sequence`、實際 `date`，以及同系列 `id`／`course`／`version`、該堂時間、老師／課室 ID 與顯示欄位等。`item.startDate` 是該堂實際日期；`session` 是該堂顯示課節數。

Teacher 回覆沒有原始系列、`weekdays`、`endMode`、`endDate`、`count`、`segments` 或 `exceptions`，避免從重複規則還原未獲授權堂次。前端另存 `sharedScheduleOccurrences`，不把逐堂資料提升為完整 `db.schedules`。Admin 保留原 canonical series DTO 與修改能力。

`since` 修訂碼包含該帳戶權限與可讀資料；拿其他身份的修訂碼、加入課程／老師篩選參數或直接使用 ID 都不會增加可讀範圍。

## 同一帳戶撤權與舊回覆處理

登入及 `/api/auth/session` 回傳 `user.accessRevision`。這是有效權限修訂碼，用來辨認同一帳戶、同一角色的權限已變更，而不是只判斷是否換了登入姓名。

- 老師連結／grant 變動、實際授課 ID 變動，以及相關課程刪除狀態會改變修訂碼。
- 單純改時間或備註不應被誤判為權限變動；等價的 following 分段會合併計算，保留相同授權範圍。
- Admin 的全校範圍修訂碼維持穩定；其他老師 grant 的變動不會令管理員正在編輯的草稿因身份切換被清除。
- 前端 session 更新發現 scope 變更後清除私人快取、選中課堂及開中的私人視窗，再讀新範圍。SDK 的請求世代控制亦拒絕舊 scope 的晚到回覆，不能回填已撤權資料或舊 CSRF token。

前端與 SDK 依據：[api-client.js](../../sample/client/api-client.js)、[flows.test.mjs](../../sample/tests/flows.test.mjs) 的同帳戶撤權／晚到讀取案例，以及[api-client.test.mjs](../../sample/tests/api-client.test.mjs) 的 access revision 世代案例。

## C-01 連續日期檢視

日期 helper 與 UI 使用同一個連續日期來源：[timetable-range.js](../../sample/client/timetable-range.js)。任意開始日期不會自動吸附到星期一；上／下頁前進或後退所選天數。8 天為 7＋1、14 天為 7＋7，篩選隱藏空日仍保留原本兩組，不把第二星期搬入第一排。

- Day／Week／Month／List 維持原有日期語義；切回 Range 保留已選開始日期與天數。
- 日期上限、閏年與跨年有純函數案例；回傳陣列分開複製，另一個呼叫或篩選不會改原資料。
- 改 View 只改顯示，不改堂次、報名、容量或費用。共用帳戶各有自己的檢視偏好；取消未保存設定不替換已保存偏好。
- Student／Parent 亦有視覺設定，但不能由設定入口新增或修改排課。

測試依據：[timetable-range.test.mjs](../../sample/tests/timetable-range.test.mjs) 與 flows 中 1–14、兩排、切換檢視、帳戶偏好及學生範圍案例。

**學生證據需分開：** 現有 demo flow 已驗只顯示該學生已 confirmed 且 paid 的示範課堂，不顯示另一名學生或未付款課堂；這是既有本機示範資料邏輯。共用 Student 未接正式 Enrollment／付款／入班，因此時間表目前空白，不能以 demo 通過當作共用 Student 已入班，也不建立假的正式學生名單或人數。

本輪的三身份日期顯示能力由程式／flow 案例支持；**本輪未實際驗收正式 Student 的瀏覽器畫面**，不能記成 Admin、Teacher、Student 三身份畫面全部已驗。這份文件沒有另行操作瀏覽器。統籌的 Admin／Teacher 操作與最後版桌面／手機、中英文、日期分組及截圖證據於下方補記；三身份可操作日期顯示不等於三身份已有同樣業務資料或權限。

## 已完成的限定驗證

1. 新 [teacher-access.test.mjs](../../sample/server/tests/teacher-access.test.mjs) 現有 **9 項真 HTTP 案例**：原 7 項涵蓋未映射預設拒絕、混合單堂／following 指派隔離及費用關聯裁切、三種 grant 與撤權、教材與直接附件、角色及 Origin／CSRF、嚴格欄位、交易 rollback、平行版本／重試與重開、有效指派／課程刪除修訂、等價 time-only following 分段修訂穩定。後補 2 項核對 linked／resource grant 的同日同時不同系列排序及完整父系列 ID／版本／時間紀錄，以及未連結老師僅有單堂 grant 時恰好讀到指定一堂。
2. 原 7 項新測試及相關 Catalog、Courses、Fees、Materials、Course lifecycle、Schedules、Resources 合計 **66／66 通過**；後補 2 項父系列 metadata／單堂 grant 案例，在未改 runtime 前定向 **2／2 通過**。另兩個附件權限及 903 筆教材跨批次精確 DTO 案例 **2／2 通過**，與後補 2 項是兩組不同驗證。903 筆只證明該服務批次讀取案例，不是 300 名學生整套系統驗收。
3. 原本假設 Teacher 可讀全校的測試改為由管理員明確發 grant，保留資料、版本、老師唯讀、Admin 原回覆等斷言；`fixture()` 沒有全域自動允許老師，未映射預設空仍有獨立案例。
4. benchmark 僅補新授權模組的複製依賴並做 smoke 檢查通過；沒有重跑大量性能量測，也未據此作大資料 UI 宣稱。
5. 獨立 QA 做限定唯讀審查，未發現具體阻擋問題：教材／附件每次目前範圍、逐堂權限不由課程 metadata 反向擴大、穩定 IDs／grant／歷史界限均符合本輪契約。QA 另驗同 id／role 撤權清快取、晚到讀取及 SDK epoch 回歸通過。

測試均使用隔離記憶體／臨時 SQLite 與虛構帳戶、資源及媒體，沒有讀寫實際業務憑證或發送邀請、付款、通知。最後完整 npm test、build 與畫面驗收不以這些限定結果代替。

### 後續定位：老師日期焦點阻擋畫面更新

統籌在真正 Teacher 瀏覽器畫面發現：課程已可讀，但 10 月 30 日的時間表仍空。起初懷疑後端逐堂回覆漏父系列 ID；上面的後補兩項真 HTTP 案例在 **未改 runtime** 時已通過，既有 helper 本來也注入父系列 metadata，因此沒有重現該假設，沒有記成「先 RED 再修 ID」，亦沒有作後端 ID runtime 修正。

有限只讀追蹤其後用隔離 VM 重現：日期導航仍有焦點時，課堂已進 `sharedScheduleOccurrences` 且畫面標記待更新，`paintSharedUpdates` 卻把日期／檢視控制一併當作不可重繪的輸入；再次 focus／poll 仍可能保留空畫面。VM 本身不模擬 DOM 替換後的所有焦點行為，當時只證明有導航焦點的條件分支。

統籌再於實際瀏覽器核對 `#tt-date` 有焦點且沒有課堂；點擊可見的 October 2026 標題，焦點轉到 BODY，下一次 poll 即顯示已授權的 **10 月 30 日 14:00** 課堂。這支持畫面更新被焦點攔截，與後端漏 ID 分開。前端修正、最後版回歸及畫面證據由統籌補記；這個定位本身不構成已修正通過。


## 主要後續依賴

- 正式 Student／Family／Applicant profile、Enrollment／付款確認／入班與名單同步，以及相關老師可讀學生資料尚未接入；R-01 在這些未實作模組的完整範圍仍需隨後續切片驗證。
- R-02 各功能／動作授權、授權老師修改 Overall Available Slots 等未由本輪 readonly flag 完成。
- 教師代表色、Available／Full 狀態點、個別學生狀態貼紙、請假／代課、待辦、正式 Staff 等仍按需求登記接續處理。
- 最終 4 老師、300 active 學生、6 課程、3–18 歲資料與完整業務流程驗收尚未通過；111 項是來源登記數，不是已完成數。
- 本輪沒有雲端部署、SEO 或 iOS 製作；共用 SQLite／HTTP API 與穩定 ID 邊界仍保留供日後接入。

## 統籌最後版本驗收：2026-10-15

本輪最後程式已通過完整 `npm test --prefix sample` **387／387，0 fail／skip／cancel，41.66 秒，exit 0**；之後沒有再改功能。最後 CSS 包含日期標籤及工具列修正，`npm run build --prefix sample` **2.83 秒成功、exit 0**；build 與全套測試分開執行，沒有並行。更早一次 387／387 為 62.61 秒，保留於工作紀錄；不是以早期結果取代最後結果。

### 真正本機畫面

- URL 為 `http://localhost:5180/account`（Admin）及 `http://127.0.0.1:5180/account`（已有虛構 Teacher 登入），頁面標題均為 Beamal Art Studio。已載入正確內容，沒有框架錯誤覆蓋；本輪查看的本機頁面 error／warn 記錄沒有相關程式錯誤。未操作正式外部伺服器或私下讀取憑證。
- Admin 桌面 **1121×1090**：由 2026-10-14 起選 14 天，日期為 14–20／21–27，共 **7＋7**。8 天實際為 **7＋1**，Next 前進八天至 22 日，Previous 回 14 日；切回 14 天保留開始日期。
- 手機實際 **390×844**：中英文 14 天均為 7＋7，8 天為 7＋1；document scrollWidth＝390。桌面最後 scrollWidth＝1121。較闊時間表及授權表在各自區內捲動，頁面沒有橫向溢出；日期標籤不再被擠成直排。
- 真正 Teacher 改至 30 日後顯示其本人指派的 14:00 堂，沒有未授權的 14／22／28 日。舊學生／申請／Leads／Staff 示範側欄入口移除；直接舊網址及偽造學生資料操作另有前端回歸。
- Admin 建立 **Lifecycle QA 20261014 的 2026-10-22 #2** 單堂授權，再解除 B 的帳戶連結。Teacher 的整月 List 只顯示 22 日 13:15，沒有同系列的 14／28 日或原本 30 日。真正打開該堂詳情後，Admin 撤銷授權；後續更新顯示 **0 詳情視窗、0 課堂**，沒有把已開資料留在畫面。
- 驗證後已把 B 還原連結到原虛構 Test teacher；Teacher 整月只回到本人 30 日 14:00 堂。新增的單堂測試授權維持停用，沒有建立帳戶、改角色／密碼、邀請、付款或通知。Admin 可授課的完整服務案例由真 HTTP 驗證，畫面本輪僅核對 Admin 帳戶可選，不把下拉選項當作另一套完整授課驗收。
- 授權管理視窗開啟時焦點在視窗內；手機 Shift+Tab 留在視窗；英文帳戶連結表單聚焦帳戶選項，Cancel 回清單原 Edit link，Close 回原入口。所有控制暫時停用及視窗外 Tab 的保護另由獨立回歸驗證。
- Teacher 日期更新的原問題已修正。真正畫面切日期後資料能顯示；延遲回覆時仍聚焦日期欄、重畫後保留焦點及不破壞未提交搜尋，以真 RED→GREEN 的 DOM 測試作精確證據，不假稱瀏覽器自動填日期本身證明全部延遲情況。

本輪正式共用 Student 的瀏覽器畫面沒有新增驗收；個人日曆控件與既有 demo 已確認付費範圍有獨立回歸，但正式 Enrollment 仍未接入。這項限制保留，不列為完整 C-01／R-01 的全部業務流程已通過。

### 獨立檢查與修正

獨立 QA 最後前端流程 **211／211**，SDK 與日期 helper 合 **24／24** 通過；全部已納入上述 387／387。早年份 ISO、暖快取授權清單資源改名／新增、舊私有示範入口、日期焦點重畫、授權視窗焦點五類問題均已修正；另一次只讀重現及相關 3 項回歸亦通過。本輪限定範圍沒有剩餘 required 發現，完整系統未完成事項見上方依賴，不視為略過。

畫面證據保存為本機臨時檔，未加入程式版本：

- `/tmp/beamal-timetable-range-desktop-final.png`
- `/tmp/beamal-timetable-range-mobile-zh-final.png`
- `/tmp/beamal-timetable-range-mobile-en-final.png`
- `/tmp/beamal-teacher-access-desktop-final.png`
- `/tmp/beamal-teacher-access-mobile-zh-final.png`
- `/tmp/beamal-teacher-access-editor-mobile-en-final.png`
- `/tmp/beamal-teacher-single-grant-detail.png`
- `/tmp/beamal-teacher-revoked-final.png`
- `/tmp/beamal-teacher-own-lessons-final.png`

手機測試尺寸已解除；只保留管理員時間表作可查看成果，臨時 Teacher 分頁已關閉。SchoolTracs 原頁本輪未有新操作，不把 Notion 授權／1–14 天的新增契約寫成原系統逐項同樣行為已查證。

分支仍為 `test`；main、AGENTS.md、原有提案 PDF 及本機私人資料沒有加入此變更。提交及推送結果由本次訊息另行交代，完整 Goal 保持進行中。
