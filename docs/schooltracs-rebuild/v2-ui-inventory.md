# v2 全系統 UI 盤點：後續模組及三角色

盤點日期：2026-10-15（香港時間）。依 `ULTIMATE-GOAL-PROMPT.md` v2、`UX-QUALITY.md`，唯讀檢查目前 `test` 工作區的程式及相關測試；只新增本盤點文件。其他協作者同時修改專案，本文是當時來源快照，整合前須重查受影響部分。

**初始盤點界線：沒有開瀏覽器、登入、讀資料庫、執行測試或操作真實業務。** 以下「已有」指程式能組成相應介面；「共用接線」指找到實際服務讀寫呼叫，不代表這輪已實際走通。後續限定 UI 修訂及測試另記第 7 節。所有排版、手機、鍵盤、流暢度與冷啟動畫面仍須 runtime（真正運行畫面）驗收，不能把這份盤點當 SchoolTracs 對齊或整個 Goal 完成報告。

## 1. 先供平行分工的模組邊界

| 可獨立指派的切片 | 建議擁有檔案 | 初步工作及整合限制 |
|---|---|---|
| Operations | `sample/client/operations-ui.js`、`operations-ui.css`、`sample/tests/operations-ui.test.mjs` | Products／Accounting／Messages／Channels／Settings 共用資料及 reducer，先由同一人處理。先補 UI 狀態、自然用語、查詢／表單及返回，不在 UI 階段假接業務。 |
| Students 管理端 | `sample/client/people-ui.js`、`sample/tests/people-ui.test.mjs` | 清單、個人詳情、各資料分組及 modal。`src.js` 負責實際服務及路由，需先約定人物 ID／返回上下文；不要自行加一套人物。共用樣式仍由主 Agent 協調。 |
| Student／家庭端 | `sample/client/student-portal-ui.js`、`student-portal-ui.css`、`student-timetable-ui.js` 及各自測試 | 依真實授權投影做完整課包／申請／家庭／活動 UI；尚未有資料的區塊如實表示未提供，不能回退 fixture。先與管理端約定相同人物及課節身份。 |
| Staff／老師工作台 | `sample/client/staff-portal-ui.js`、`staff-portal-ui.css`、`staff-shared-adapter.js` 及各自測試 | 員工目錄、個人資料、工作台、假期／打卡／薪金 UI。保留實際 resource ID、現有編輯與權限 callback；補未接狀態及核心子流程。 |
| 工作流程 modal 共用層 | `sample/client/lesson-workflow-ui.js`、`lesson-workflow-ui.css`、`account-actions-ui.js`／CSS、`data-tools-ui.js`／CSS 及各自測試 | 出席／調補堂／訊息／試課／家庭／啟用／檔案工具的 UI。必須接收明確人物、課節及來源位置；不能預設另一名學生。 |
| Shared host／Reports／Leads | **同一位** `sample/src.js` 寫入者；`sample/client/interface-preview.js` 也指定唯一整合者 | Reports 及 Leads 尚在 src；People 工具列、角色導航、真實訂單和各 modal callback 亦在此。不要讓多工各自改同一共享檔。可以先交獨立的 markup helper，再由整合者接入。 |

不同切片的測試可各自更新；共享 `src.js`／`style.css`／`interface-preview.js`、共同資料契約及模組移出應先協調。這不是現在重構框架的要求。

## 2. 入口、角色與資料來源總表

主要管理入口為 `/account` 加側欄狀態；Fees 有 `/account/fees`；學生個人詳情有 `/account/people/:personId`。不是每個側欄項目都有獨立 URL。來源：`src.js:291–294`、`1371–1391`。

| 頁面／角色 | 已有入口及主要 UI | 程式中的資料現況 |
|---|---|---|
| 管理員兼老師 Maya | 我的工作台、通知、Sales、Timetable、Courses、Fees、Products、Messages、Students、Leads、Accounting、Reports、Staff、Channels、Settings | `authUser.role==='admin'` 區分真實權限；部分舊 UI 內部仍沿用 `role==='teacher'`，不能只憑此字串判斷是普通老師。 |
| 普通老師 Leo | 我的工作台、Timetable、Courses、Fees、Notifications | `isScopedTeacher()` 有獨立入口限制。真實可讀課節由授權服務提供；直接網址及服務權限仍需後續獨立驗收。 |
| 學生／家庭 Chloe | My Calendar、My classes、Payment History、Profile & family、My requests、Notifications、Courses & events | 課表、啟用課節、訂單及明確連結人物使用共用服務；課包餘額、優惠、申請、通知、活動仍未有正式投影。 |
| Students 管理 | Student／Applicant segments、搜尋、名稱／建立日排序、升／降序、分頁、個人詳情、編輯 | `people-ui.js` 配合 src 的 people/person/history 服務。個人資料與修改歷史已有共用接線。 |
| Staff 管理 | 在職／全部／老師／管理員、搜尋、分頁、個人詳情、Add staff、登入帳戶設定 | shared adapter 讀實際教學資源、帳戶連結及排課；共享模式不再以另一組員工 fixture 取代。 |
| Products／Accounting／Messages／Channels／Settings | 各有完整主畫面及多個 modal | `interface-preview.js:14` 建立各自 `getOperationsPreviewData()`；未注入 shared snapshot，變更只保留 presentation state。 |
| Reports | Sales／Enrollment／Product／Staff 四組共 19 項 | 只有清單及說明；所有 report buttons 停用，無查詢詳情 UI。符合「按鈕先停用」的階段安排，但不等於全報表 UI／功能完成。 |
| Leads | 清單、空狀態、搜尋、Stage／Level、Active／Archived／All、選取、封存／恢復、Create／Edit、Columns | `db.leads`／`db.leadColumns` 經 `save()` 保存瀏覽器本機資料；不是 shared service。Owner 仍是 Teacher 1／Teacher 2。 |

## 3. 各模組子頁、modal 及 UI 缺口

### Products

- 已有：產品總數／低庫存／缺貨摘要、關鍵字／狀態／分類查詢、產品表格、詳情、Create／Edit、Adjust stock（增加／減少、數量、原因）。欄位有中英文名、SKU、分類、售價、成本、庫存、補貨門檻、狀態、中英文說明。來源：`operations-ui.js:46,56,65–88`。
- 尚未見：排序／分頁控制、真正庫存異動歷史、明確商品折扣路徑、Location；照片／Online Store／Tax 等應先按 PDF 候選欄位分類，不直接當全部已確認。產品封存可在表單選狀態，沒有獨立刪除／還原任務。
- 不自然之處：來源有固定四件示例產品、固定分類，新增強制中英文兩名；目前沒有來源證明這些是最終商業限制。錯誤／成功仍多處寫「預覽」「虛構」。UI 階段應保留誠實限制並精簡文案，不能假稱已寫共用庫存。
- 後續實際驗收：多產品／長名稱、查詢無結果、離開／返回保篩選、加減庫存錯誤、繁中／英文及手機詳情／表單底部操作。

### Students 管理端

- 已有：Student／Applicant 名冊、搜尋、兩種排序及方向、20 筆預設分頁、loading／error／empty／no match、真實個人詳情及修改歷史。詳情按個人、聯絡、兩 Contact、學校／推薦、記錄日期、備註分組。來源：`people-ui.js:26–64`。
- 已有表單：Add applicant／Edit、出生日期、身份／姓名、家長／WhatsApp／電話／Email、promotion 三態、學校、程度、職業、referrer、帳單名稱、日期及長文字。`peopleConversionMarkup()` 也有人工 Convert confirmation；**現有 src 對個人詳情傳 `canConvert:false`，未實際提供這條真實入口**（`src.js:558–566`）。
- 未完整提供：個人下的課程／課包／Payment／Attendance／Family／Trial／相關老師的完整子頁；明確中英文姓名資料結構；新建正式 Student／Family／登入啟用的自然路徑。不能用已存在 Contact 欄位代替 Guardian／家庭授權。
- 重要 UI 風險：People 清單與指定人詳情前方都加 generic「試課／Convert／Family／啟用」工具列（`src.js:1369,1373–1374`）。launch 未帶 person ID，host 的預設 workflow 又可帶入獨立示例學生／課堂（`interface-preview.js:35–39,99–110`）。應以人物任務為入口，未接行為不得冒充正在處理所選真實人。

### Sales／真實訂單與 Accounting

- Sales／Payment Management 已有共用訂單清單、Refresh、訂單詳情、Sent／Parent confirmed／Paid 等分開狀態。管理員可由時間表某堂「加入學生」建立草稿，選學生／Fee、Single／All from this date、指定範圍、勾課節、最終金額；另有 Send 及核實收款。家長有 Confirm／Reject／Request changes 及可選原因。來源：`enrollment-orders-ui.js:16–20`、`src.js:814–839`。
- 目前新增訂單的真實入口限指定課堂；尚未是「先選學生 → Courses／Fees／Products 多項選取」的完整老師主動出單 UI。普通老師不能在此寫入；最終授權政策仍須按 Goal 追蹤，不能把這個限定當永久產品規格。
- 真實訂單 PDF Receipt 打開的是以當前訂單資料建立的**版面預覽**；沒有真 PDF、保存或寄件。這條路與 Accounting 的 fixture invoice 有隔離，不能把預覽算作文件交付（`interface-preview.js:40–47`）。
- Accounting 已有 Invoices／Payments／Credits、搜尋、三摘要、詳情、Create invoice、Record payment、Create credit、PDF options → Save settings／Email settings → Preview。來源：`operations-ui.js:47,57–59,108–119`。
- 仍是獨立示例 invoices/payments/credits，沒有對接上面的共用訂單；同名 Chloe 不等於相同 stable ID。主畫面「本期收款／單據」無選定期間，實際是把所有示例列相加。新單據表單只有兩列自由文字項目，沒有完整動態多項／產品選取／優惠分類。
- 未有：月／季／年查詢、對帳下鑽、正確 receipt history、真附件、outbox、自動單據／寄件設定及失敗／重試 UI；信用調整／退款仍需政策，不因有 credit form 就當已確認能退款。
- UI 首要：清楚區分學生訂單、付款申請、收款、Invoice／Receipt／Credit 與版本；提供自然返回原訂單／人物／課堂的路徑，不能令兩套類似金額來源看似已對帳。

### Reports

- `src.js:1337–1366` 已有四組 19 項：Sales 9（Payment／Sales／Earned Revenue／Discount 各 Summary、Detail，加 Deferred Revenue By Package）、Enrollment 6（First、Last、Detail、Lesson Detail By Staff、Package Usage、Metrics）、Product 2（Summary、Detail）、Staff 2（Salary Summary、Time Clock Detail）。各項已有雙語說明及 disabled button。
- 尚未有任何 report-specific date／period／filters、結果表／總計、empty／loading／error、交易下鑽、返回及輸出 UI；PDF 所需 Course Payment Summary 未見獨立同名入口。Phase A 應先盤點與設計這些子畫面，按階段停用未接按鈕；Phase B 再逐項接真實資料。
- 不從清單上的 cash／earned 說明推定算法已確認或已實作；月／季／年、邊界、時區、折扣及退款口徑應保留具體待決欄。

### Staff／老師工作台

- 員工目錄已有搜尋、在職／全部／老師／管理員、分頁及摘要；共享模式預設在職，保留舊 inactive。個人 modal 有 Contact／Teaching／Permissions／Leave／Salary；Add／Edit 已 callback 至真實 resource editor，權限由指定員工去真實登入／課堂授權設定（`staff-portal-ui.js:42–78,87–102`、`interface-preview.js:87–102`、`src.js:780–805,1494`）。
- shared 權限頁已改為 factual「登入及資料範圍」，不顯示假的 module No access matrix；legacy matrix 仍保留供獨立舊預覽，不能將其當 backend 權限。需保留 real staff ID 及個別設定返回路徑。
- 老師工作台有 Home／To-do／Classes／Clock／Leave／Payroll；今日沒課時顯 upcoming，Classes 可顯示授權視窗全部課節；課堂詳情 callback 打開真實 scheduleId＋sequence。roster 未讀時用未知，不亂填 0（`staff-portal-ui.js:49–61`、`staff-shared-adapter.js`）。
- adapter 目前明確給 `todos:[] / paymentRequests:[] / payrollRows:[]`；Clock／Leave 是該 host 記憶中的 UI state。沒有真實待辦、假期、打卡、薪金服務接線。共享畫面會把空 todos 說「沒有待辦」，須區分「未接資料」與真正無待辦。
- 有待辦詳情、優先排序、付款申請審核及文件 modal 的 legacy UI，但 shared 下沒有來源資料；不可用這些 fixture 宣稱真實老師續報／試課／代課待辦已完成。
- 明顯 UI 差異：Leave 只有 Annual／Sick／Personal，缺 Compensation、Admin Approve／Reject／直接登記、Affected Sessions／逐堂 Assign Substitute；legacy Clock draft 仍會把 Out 補到舊 row，與 Goal 獨立事件模型不同。第 7 節已統一單一 Clock 入口並禁止 shared 模式假建紀錄；無距離／外勤／照片與原因開關狀態，真正事件模型尚未接線。Payroll 缺月份選擇、Monthly／Hourly 分別及真正 PDF history。
- Staff 顯示的聯絡／入職／僱傭資料並未都有正式來源，不能靠 legacy profile draft 蓋掉 shared 事實。Loading 時目錄摘要仍可能先出 0；shared snapshot 沒有把讀取 error 一併傳入，此處需設計清楚載入／失敗／重試。
- 初始盤點的「專注於你的課堂」及重述用途 quick-note，已按主 Agent 真實畫面觀察作限定修訂（第 7 節）；不是用 CSS 一刀切隱藏說明。

### 學生／家庭端

- My Calendar 有 month／連續 range 顯示控制，My classes 使用共用啟用課節；Payment History 使用共用訂單。資料來自明確授權人及 session，shared 不回退 legacy bookings（`src.js:223–226,823–829`、`student-timetable-ui.js`、`enrollment-orders-ui.js:20`）。
- Profile & family 使用連結人物切換、登記資料、課堂概覽、老師／課室及課節；目前不提供自改登記資料。課包餘額及 Coupon 明確未提供。這是有限已接 UI，不是完整家庭中心（`student-portal-ui.js:27–60`）。
- My requests 有選定學生的課堂及 Request Rescheduling／Apply for Sick Leave，再由 host 傳實際課節。**只顯前六堂，沒有下一頁／查看全部**（`:64`）；300 人規模之外，單個孩子多於六堂亦需能選後續課。
- shared 模式把 packages／coupons／requests／notifications／staffNotifications／paymentItems／information 全部清空；Request to Pay／profile edit／slip 等操作拒絕或不提供。Notifications 的 Mark all read 仍可見，但 shared 不實際讀寫；Courses & events 只是一個未提供訊息（`:27–33,64–86`）。
- legacy 下有完整多項付款要求、優惠核對、FPS 檔名預覽、通知詳情、package detail、活動詳情及 profile edit，但它們不等於當前 shared 帳戶可用。shared 家庭欄沒有 Add Family Member／Trial／Direct 的完成路徑。
- 後續 UI 必需：真正 Family／孩子關係與新增、獨立堂數／分鐘／歷史、Request to Pay、老師回覆後付款／Slip、Receipt history、續報、推薦優惠留存、通知及活動發布。先設計全鏈狀態，不在功能未接時借其他孩子／訂單做示例。

### Leads

- 清單／篩選／批量封存及恢復、長 Create／Edit modal、空狀態、Columns 已存在。表單包含個人資料、兩 Contact、學校／Level、Owner／Stage／來源／Comments；Student no.／日期等部分欄位停用；有頭像預留。來源：`src.js:1276–1336`。
- Columns 已有三橫條手把、pointer draft reorder、鍵盤上下、顯隱、Name 不可隱藏、OK 後保存、取消還原；**沒有另外可點的非拖動排序控制**。單靠鍵盤不等於所有觸控使用者都有等效操作，需按品質標準補適當方式並實際驗。
- Owner 仍以 Teacher 1／Teacher 2 的名字作值及驗證，不是四老師群體／stable resource ID（`:275,1292,1300`）。資料只在 localStorage；沒有同一服務的 Lead→Applicant／Student 關聯。全域「試課跟進／轉為學生」會開 generic preview，不是在指定 Lead 行內續辦。
- Import／Export 打開檔案工具 UI，僅讀檔名及預設欄位，沒有解析／輸出檔案。不能因按鈕有 modal 就算匯入／匯出完成，也不因複雜直接列 minor。

### Settings／Messages／Channels

- Settings 八類：General、Courses、Notifications、Payments、Templates、Coupons、Email templates、Public slot visibility；有表單、開關、Coupon create/edit、雙語 Email template editor、單據樣式。頁後另有真實 Scheduling resources／Class types 及 News management 入口（`operations-ui.js:50–52,107–119`、`src.js:1370`）。
- 主要設定仍是 operations draft；尤其 Public slot visibility 與真實 Availability 管理有兩條近似入口，Save draft 不會更改正式公開時段，容易誤認為同一設定。應約定單一正式來源及 UI 歸屬，保留 v2 Regular／Trial／Full 協調。
- Payment settings 有 FPS／Bank／Cash，但現有已確認主流程是 FPS；Courses 有預設 waitlist／booking window 等未接選項。不要把示例預設當政策或聲稱會作用正式排課。Settings 缺真正 clock／payroll／leave／續報／自動單據觸發的完整子設定 UI。
- Messages 有 conversation list、搜尋、thread、reply、compose、preview、back to edit；資料為獨立示例家庭，只有預覽，沒有真實收件人／服務／outbox。缺統一模板、精確學生／課次上下文及交付狀態。
- Channels 有 Portal／WhatsApp／Email／Online store 卡片、detail／settings、sender／reply/contact/toggle；未連外部服務，沒有假 delivery 是正確界線。支援說明仍偏工程階段宣傳，Phase A 要保留必要限制但精簡、自然化；正式外部接駁本輪不做不等於本機通知流程可略過。

## 4. 跨頁 modal 及返回鏈

| modal 系列 | 現有畫面／步驟 | 源碼界線及後續檢查 |
|---|---|---|
| Lesson workflow | Attendance＋Remark／Sticker；Make Up This Class 日期 accordion→slot／Pending→review；Message template／channel→preview；單人調課／病假；Applicant details／trial／follow-up；Convert；Family list／add／Trial／Direct／review | `lesson-workflow-ui.js:42–92`，變動是 preview reducer，不調 shared API；whole modal 有「介面預覽」提示與 preview CTA。保留誠實狀態，改為合理人物入口及簡潔限制，不能只刪提示後假接通。 |
| Account actions | Activation／Reset；Family enrollment；Trial selection→details→review→complete | `account-actions-ui.js:21–126`。有日期、名額、聯絡資料校驗，但只 presentation state。現在 generic launch 未注入 shared 正式可選時段／人物；需精確上下文契約。 |
| Data tools | Import file／duplicate handling；Export format／range／columns；review→complete→back | `data-tools-ui.js:4–35`。固定 name/category/level/email/remark 五欄共用所有 entity，沒有實際解析／輸出；未對課程／Fee／Lead／學生各自 schema 適配。 |
| Order document | 真訂單→當前版本單據版面→PDF options→save／email settings／preview→返回訂單 | `interface-preview.js:40–47` 有當前訂單金額及 version。實際文件生成／持久保存／自動與手動 outbox 均未接，不能改成假 download。 |
| Staff identity／access | Directory→指定 resource→Contact／Teaching／Access／Leave／Salary；Edit→真 resource editor；Access→真 linked user grants／未連結者 link editor→原 profile | 具明確 callback；務必保 stable ID、開啟版本、取消／失敗／撤權及 late reply 不重新打開舊 modal。 |

`interface-preview.js` 目前統一管理 overlay、Tab focus trap、Escape、原入口焦點及 UI draft；沒有 API client／browser storage／真實發送。這是刻意架構界線。擴 UI 時需指定該檔唯一整合者，不讓各 worker 各自接後端或改 host state。

## 5. 優先缺口：先完成 UI，再接功能

| ID／優先 | 當前來源問題 | Phase A 可交付的獨立結果 |
|---|---|---|
| UI-A1／高 | 真實 People 的 generic workflow 未帶人物／課節，可能帶 unrelated fixture | 由指定人物／申請／課節進入，清楚對象與返回位置；沒有對象時選擇而非默認示例。未接操作明確標示並保草稿。 |
| UI-A2／高 | Leads Owner 仍 Teacher 1／2；Ops／部分工作流程用另一組學生／交易 | 統一角色／人物／課程 presentation contract；canonical IDs 與 UI draft 分開，不重建或覆蓋示例群體。 |
| UI-A3／高 | Accounting／Sales 相似資料分離，沒有完整學生起點多項開單路徑 | 訂單／收款／文件資訊架構、動態 items／折扣／版本、前後狀態與返回鏈完成；真實已接訂單保持可用。 |
| UI-A4／高 | Shared 學生申請只首六堂；家庭／課包／付款要求／通知／活動仍不完整 | 各主要子頁／表單／詳情及完整 loading／empty／error／unsupported 狀態；能定位任意授權課節，禁止 fixture fallback。 |
| UI-A5／高 | Staff shared 空資料看似真空結果；Leave／Clock 模型及子流程不足 | 四假期、Admin 審批／登記／Affected／逐堂代課 UI；獨立 Clock events／外勤四種配置／薪金類型與月份／Payslip history UI；未接與真正零結果分清。 |
| UI-A6／高 | Reports 只有 19 個停用入口 | 先列期間／篩選／結果／總計／明細／返回／輸出及狀態；加入 PDF 需要的 Course Payment Summary，計算口徑留待確認。 |
| UI-A7／中高 | Draft Settings 與 real settings 重複／含未確認預設 | 設定歸屬一致；Public、課型、老師／課室、收款、續報／寄件／員工設定有明確來源、狀態及入口。 |
| UI-A8／中 | 預覽／虛構／fixture 名稱及重述用途文案仍散落 modal、notice、email template | 改自然示例及精簡提示；不移除必要「未保存／未生成／未寄出」事實，不假稱功能已接。 |
| UI-A9／中 | Products、Accounting、Leads、Messages 長資料的排序／分頁／保留情境不完整 | 可持續查詢、清空、查看／編輯、取消／返回及合理分頁；不以固定四件產品／三張單據判定規模足夠。 |
| UI-A10／中 | Columns 有 pointer＋keyboard，但沒有可點非拖動等效方式 | 保留三橫條主手把，加適當的非拖動操作；焦點、取消、邊界及保存狀態一致。 |

上表是程式盤點推導的 UI 工作候選，須由主 Agent 與實際畫面對照後定切片優先次序；它不取代 Goal 的課程＋費用＋時間表聯合流程優先。

## 6. 已閱讀的測試與未驗範圍

| 證據檔 | 目前可支持的來源結論；本輪未執行 |
|---|---|
| `sample/tests/operations-ui.test.mjs` | 有主頁／表單／filter／escape／純 reducer／Receipt options／Coupon／templates 等斷言；多項明確測「preview only」。不是 shared 業務或視覺證明。 |
| `sample/tests/people-ui.test.mjs` | Directory segments／search／pagination／loading／error／profile／history／editor／Convert markup 及可選欄位。真 Convert 入口仍受 src capability 限制。 |
| `sample/tests/staff-portal-ui.test.mjs`、`staff-shared-adapter.test.mjs` | legacy workflow、shared stable IDs／authorized subset／live projection／active staff／factual permissions；不能支持 shared 待辦／Clock／Leave／Payroll 已保存。 |
| `sample/tests/student-portal-ui.test.mjs`、`student-timetable-ui.test.mjs` | shared 人物／課節／切孩子／無 fixture／rename／loading／error，以及 legacy request／coupon／notification。不是所有 shared 學生子流程完成。 |
| `sample/tests/interface-preview.test.mjs` | host callback、精確學生課節解析、order document隔離、表單／返回；不代替 runtime focus／真發信。 |
| `sample/tests/enrollment-orders-ui.test.mjs` | Parent Confirm 與 Paid 分開、Admin Send／核實付款、lessons／fee suggestion／account links。實際 UI、付款原子性及跨角色需另驗。 |
| `sample/tests/lesson-workflow-ui.test.mjs`、`account-actions-ui.test.mjs`、`data-tools-ui.test.mjs` | 已有步驟／日期／可選項／error／review／back 的 source-level 斷言，明確不改業務記錄。 |
| `sample/tests/flows.test.mjs` | 包含角色導航、sidebar、Leads drag／keyboard、共用 People／訂單／課表、preview entry及Staff callback等整合案例；VM／DOM 測試不證明實際排版或本輪全部通過。 |

`STATUS.md`／`DEFERRED.md` 保留很多較早切片及當時缺口，部分已被後來接線更新；本盤點以當前程式分清，沒有沿用舊 543／543 等結果當本輪測試。v2 的 PDF 原稿優先、自動單據／公開常規課表等協調方向高於舊文件描述，不因歷史「Notion 已確認」便覆蓋 v2。

下一輪真正畫面驗收至少逐角色記錄繁中／英文、390／768／1280 CSS px、長資料、Tab／Escape／Back／取消、移動側欄收起、搜尋／分頁／捲動保持、未知／未接／失敗狀態與 modal 頭尾可達。執行 UI 切片後按 AGENTS 做相關測試及完整 test／build，由非製作者重做同一任務；本文件所有 runtime 欄目前均為「未驗」。

## 7. 限定 Staff UI 修訂（2026-10-15）

- 主 Agent 已在真 Chrome 的 Leo 工作台觀察到 filler。本片只改 `staff-portal-ui.js` 及其測試，移除「Your teaching, at a glance／專注於你的課堂」、重述用途段落及其重複 Leave／cover CTA；保留老師工作台 nav 的 Leave／請假及內頁 Request leave，沒有丟失假期表單入口。沒有修改 CSS 隱藏其他說明。
- 工作台及 Clock 頁使用中性單一 `Clock／打卡` 行動；Clock 頁只保留一個行動，日期／時間及歷史仍可見。不再在按前顯示 Clock in／out 或宣稱已上班。歷史欄位的 In／Out 只是既存 legacy 版面，尚不代表正式獨立事件模型完成。
- Clock modal 保留當前老師、日期／時間及備註，清楚提示未接通。shared 確認停用；直接或過時的 submit 也不新增紀錄、不切 `clockedIn`，保留輸入。legacy presentation reducer 仍只供獨立示範，不作真打卡宣稱。未接 GPS／照片／打卡服務。
- `node --test sample/tests/staff-portal-ui.test.mjs sample/tests/staff-shared-adapter.test.mjs sample/tests/interface-preview.test.mjs` 最後 **42／42 通過**；另有 syntax check 及 `git diff --check` 通過。首次 41／42 是新斷言誤將有效的歷史表格 In／Out 欄名當入口而失敗，已收窄至操作／狀態並重跑，沒有為測試移除歷史欄位。
- 全套 test／build 及修改後真實中英文／手機／焦點畫面交主 Agent 整合驗收；本片沒有操作瀏覽器、改 backend／adapter／src／共享 style、Commit 或 push。UI-A8 僅此 Staff filler 部分處理，其他模組及 UI-A5 核心子流程仍待完成。
