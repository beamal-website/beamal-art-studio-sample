# Notion 核心需求覆蓋與驗收清單

整理日期：2026-10-14。範圍為主文第一至十三節、EX-01～EX-08，以及追蹤表的 R／C／T／D／A／M／P／W／TM／X 項目。本檔只盤點需求與本輪讀到的程式，不修改 Notion，也不是功能完成聲明。

原盤點及其缺口保留為歷史基線。2026-10-15 新增的共用 People 檔案基礎與證據限度見本檔末尾追加及 [People 檢查點](people-profile-checkpoint.md)；不能把原表所有缺口當作最新程式狀態，也不能把追加部分當作整列需求已完成。

## 來源、目前目標與狀態讀法

- 主文來源：[Notion 原文快照](notion-requirements-source.md)，取得日期 2026-10-14，頁面最後編輯 2026-10-11。
- 逐列來源：[完整 111 列需求表](notion-requirements-register-source.json)。全表為 **92 已確認／9 待討論／9 待細化／1 暫緩**；本檔覆蓋的 **48 列為 41 已確認／6 待討論／1 暫緩**。這些都是來源的需求狀態，**「已確認」不等於已實作或已驗收**。
- 使用者最新規模與範圍：**4 位老師、300 名 active 學生、6 個課程、3–18 歲**。這次驗收以本機完整運作為目標；遠端伺服器部署、iOS 共用資料庫及 SEO 屬未來方向。主文「約 10 種課程」是舊範例，以最新 6 課為規模基準，課程名稱、價格、課包及實際課室以後台資料為準。
- SchoolTracs 的排課新增、單堂／往後修改、刪除及 Undo 證據只覆蓋該基線切片；不能把它們當成下列試課、權限、學生課務、配額或付款的 Notion 驗收。
- 本檔的「碼有基礎」只表示存在可重用程式；「缺口」表示業務要求尚未由目前共用服務完成。排課資源清單／多選正在本輪整合，不能用未完成的整合碼宣稱通過。每列的驗收場景都是**將來需要實際執行的測試**，本次沒有執行它們。

## 必須保留的來源矛盾與命名邊界

1. 主文前言、§十二及§十/P-12 仍稱後頁尚未逐項評審，但後面的§十三、§十四～十七及 register 已有新增確認項目。保留這個版本差異；逐項引用其所在節及 register 狀態，不把前言視為取消全部後續確認，也不反過來把未討論事項當成批准。
2. **register/P-01～P-04 是家長訊息需求；§十/P-01～P-15 是待討論索引，兩者不是同一組 ID。** 例如 register/P-01 為 Send Message to Parent，§十/P-01 為普通老師權限。本檔均明示命名空間，避免錯配。
3. 已確認的老師權限方向是「自己負責／獲授權的資料＋獲准動作」，不是全校唯讀。Admin 本身也可授課。可改 Capacity、學生名單、代班等細項仍待定；2026-10-15 已接入現有課程、費用、排課、資源、教材及附件的老師自身／明確授權讀取；未接正式學生／申請範圍，R-01 整項仍未完成。普通老師的動作權限仍維持唯讀，不當作 R-02 已完成。
4. **內部 1–14 天**與**公開預設 7 天、最長 30 天**是兩種設定，不能用 Week／Month 按鈕或同一上限代替。
5. 班次主色、學生彩色貼紙、Full／Available 紅綠小點互相獨立。老師缺席、學生 Absent／Sick／個別 Pending 不是自動釋放班額的事件。
6. 個別課務以 **Student Session（某學生某一堂）**為狀態單位；全班 Class Session、Trial Request、付款要求分別是獨立記錄。Pending Confirmation 不能寫到全班或整套排課。
7. 扣堂、補堂資格、移轉原／目標班額、已滿班強制 Available 是否容許超額、退課／退款等逆向流程仍待討論；不以範例或現有示範邏輯替客戶決定。

## 本輪程式證據索引

行號是本輪讀碼位置；其他協作者仍在整合，後續應以同名函式重新定位。下列沒有把私人的本機資料當成證據。

| 證據 | 現有程式與實際邊界 |
|---|---|
| E-AUTH | `sample/server/app.mjs`：`/api/schedules` GET 向 admin／teacher 返回 `store.schedules.list`，未帶負責老師／授權範圍；POST／PATCH 等寫入限 admin。`/api/courses`、`/api/scheduling-resources` 亦主要按角色分讀寫。`sample/server/store.mjs` 的 users／sessions 及 `src.js:311 applySharedUser` 有真登入和身份切換清理基礎，但不是逐課／逐學生的資料權限。 |
| E-COURSE | `sample/server/validation.mjs validateCourse/validateCourseMetadata`、store 的 courses／fees／course_fees；`src.js openCreateCourse`、`portalCourses`、`portalCourseDetail` 有共用課程與收費。尚無完整適齡、課程內容、Class Type 規則、學生已購／剩餘堂數模型。 |
| E-SCHEDULE | `sample/server/schedules.mjs`、`sample/shared/schedule-occurrences.js`、`src.js openSchedule/saveSchedule` 有共用重複排課、單堂／往後及例外序號；不是 AvailableSlot／TrialQuota／StudentSession。固定課次序號與版本處理可重用，不代表個別學生調課完成。 |
| E-RESOURCE | `sample/server/scheduling-resources.mjs` 與本輪 UI／SDK 有老師／課室資源、ID 指派及多選基礎；老師資源未連到登入身份、授課權限或代表色。Room 的 capacity 是資料欄位，未證明會限制正式班額。資源切片尚在整合。 |
| E-VIEW | `src.js:652 timetableDays` 目前 Day、Week、Month、List；`defaultTimetableViewSettings` 設格距／高度及展示元素；`timetableResourcePanel/timetableClasses` 有老師課室篩選。沒有任意連續 1–14 天、7×2 排版或預設／自訂 Eye filters。學生端 `studentCalendar` 是另一個月份示範介面。 |
| E-CLASS | `src.js timetableSlotStats` 在 shared 模式學生／待付款數顯示「—」；`timetableLessonStudents` shared 返回空清單；`lessonDetailMarkup` 的 Enroll student 停用，出席／補堂等欄位尚無操作。卡片使用 schedule.color，未連老師色或獨立 Full 小點。 |
| E-LOCAL | `src.js initial/db.classes/db.bookings/db.requests`、`joinForm`、`requests`、`markPaid`、學生目錄及 `managementPage/openTeacherManagement` 仍有舊示範或 localStorage 流程。它們不是正式 TrialRequest、Applicant 轉換、支付狀態機或多使用者共用學生服務；示範的「已付款即可列學生」不能代替 Convert to Student。 |
| E-PUBLIC | `src.js:117 cards`、`detail/courseSchedule`、`joinForm` 主要使用示範 courses／db.classes。匿名正式 Overall Available Slot、Public Visibility、Trial 配額與 7–30 天顯示未接入；course.onlineStore 不等於 Slot 公開設定。 |
| E-TODO | 老師 `stats/teacher` 目前是學生／新報名統計與今日課堂；`toast` 是短暫操作回饋。沒有共用 TodoTask、持續跟進、個人分類排序、Notification Centre 或 MessageDelivery。 |
| E-DATA | 共用服務已有 users、courses、fees、schedules、materials、attachments、scheduling_resources 及部分 audit／冪等交易。沒有 Applicant／TrialRequest／AvailableSlot／SlotQuota／StudentSession／PaymentRequest／Attendance／TodoTask／Notification／MessageTemplate 的完整服務表和 API。「交易」指同一次業務更改全部成功才保存；現有一般交易工具不能直接當作配額流程已完成。 |

## 角色及正式時段（R，5 列）

| ID／來源狀態 | 來源節 | 業務效果 | 現有碼／缺口 | 可驗收場景 | 待確認 |
|---|---|---|---|---|---|
| R-01 已確認 | §2.1、5.1；EX-04；register PDF2 | Admin 可授課並管理全校；普通老師只見自己／授權課堂、學生、申請。 | E-AUTH 真登入可用；現有課程／排課等已接老師資源與現有帳戶連結、課程／資源／單堂 grant、撤權及逐堂讀取。正式學生／申請與帳戶生命週期仍缺；本輪最後整體及畫面證據見 [限定檢查點](teacher-scope-range-checkpoint.md)，不能列 R-01 全項完成。 | Admin 同時被指派授課；B 只教 A 班，不能經 UI、URL、API、搜尋／Filter 讀 C 班及其學生／申請；授權後才可取得，再撤權後清除快取／開啟的詳情。 | §十/P-01：動作與資料範圍詳細配置；不能以此未定為理由放寬已確認的讀取邊界。 |
| R-02 待討論 | §2.1、5.5、§十/P-01 | 普通老師哪些新增／修改動作須可設定。 | E-AUTH 目前一律唯讀，尚無可配置授權。 | 決定權限表後，分別測建立 Slot、改學生名單、Capacity、課程屬性、代班；未授權要求須服務端拒絕。 | 哪些動作、範圍、是否審批；本列不可先寫最終政策。 |
| R-03 已確認 | §13.2、13.4 | Admin 管理正式 Overall Available Slots，與公開頁使用同一來源。 | E-SCHEDULE 有班次排課，E-DATA 尚無試課／調課資格及三配額正式 Slot。 | Admin 建可試課／可調課的 Slot，重新載入仍在；公開頁從同一 ID 讀到允許公開內容，無第二套獨立時段。 | 配額與資格具體細節見 T-01；排課與可預約 Slot 的關係須建模，不能直接視為同物件。 |
| R-04 已確認 | §13.2、13.5 | Admin 可授權普通老師管理特定 Overall Slots／公開顯示，而不授予 Admin 身份。 | E-AUTH 尚無動作＋範圍授權；teacher 寫入被全部阻擋。 | B 獲 A 範圍 Slot 編輯權後能保存並同步公開頁，仍不能改 C 範圍；另給 Public Visibility 權，只可公開／隱藏。 | §十/P-14：欄位、授課範圍及審批；公開設定授權方向已確認。 |
| R-05 待討論 | §13.3；§十/P-13 | 提案的 Personal Slots 只供 Admin 看老師空檔，不是可預約 Trial Slot。 | 尚無獨立個人空檔層；不能用共用 schedule 冒充。 | 若確認需要，再測個人提出→Admin 可見→審批／轉正式；未轉正式不能被訪客預約。 | 是否需要、獨立資料層、轉正／同步機制。 |

## 內部時間表及班次（C，7 列）

| ID／來源狀態 | 來源節 | 業務效果 | 現有碼／缺口 | 可驗收場景 | 待確認 |
|---|---|---|---|---|---|
| C-01 已確認 | §5.2、§十一；EX-05 | 三類身份任選開始日及連續 1–14 天；1–7 天一排，8–14 天第二排，每排最多 7 日。 | E-VIEW 已加入從選定日期連續 1–14 天及 7＋7 分組，Admin／Teacher／Student 都有顯示控件；既有四種檢視保留。共用 Student 尚未接 Enrollment，不能以示範已付款課堂代替正式個人入班資料；最後版畫面與回歸見 [限定檢查點](teacher-scope-range-checkpoint.md)。 | 三身份逐一選 1、2、6、7、8、13、14 天，跨月／跨年前後切換；14 天確為 7×2；切換前後資料、名額和權限均不變；手機易讀。 | 核心規則明確；窄屏具體呈現可設計但不能改成單排 14 欄。 |
| C-02 已確認 | §5.3；§十/P-11 | Admin 可組合預設／自訂條件，每列 Eye 顯示／隱藏並保存個人設置。 | E-VIEW 有老師／課室 checkbox、搜尋、部分展示元素；缺 Class／Availability 類型、自訂條件、Eye、個人保存。 | B11／B8、Regular／Special、Trial／Rescheduling、自己班次，加學生／性別／時間／價格條件；Eye 即時隱藏；重開保持個人設定；無權資料不從 API 傳回。 | AND／OR、空條件、敏感資料可見性及自訂欄位的組合方式。 |
| C-03 已確認 | §2.1、5.4；EX-05 | 老師代表色決定 Slot 主色。 | E-RESOURCE 沒有老師色；E-SCHEDULE／E-CLASS 現為每套排課任選色。 | Admin 改老師 B 代表色，B 的課堂在自己與全校時間表同步換主色；Full 紅點及學生貼紙仍獨立。 | 同堂多老師時採哪個主色或多色呈現，正文未定；不可由現有多選資料自行假設。 |
| C-04 已確認 | §5.4；X-02 | 正式佔用達 Capacity 自動 Full；Admin 可提前 Full 或強制 Available。 | E-SCHEDULE 有 capacity，E-LOCAL 有 occupied/free 示範；shared 未有正式學生佔用、狀態覆蓋。 | 7/8→8/8 自動 Full；7/8 手動 Full、8/8 手動 Available 保存並跨身份一致；狀態改變不偷偷改人數。 | 強制 Available 後能否超額及退課釋位政策未定；顯示綠點不能繞過未決的最終配額校驗。 |
| C-05 已確認 | §5.4、6.1；EX-05、06 | 右上獨立綠 Available／紅 Full；Absent 等不釋位。 | E-CLASS 尚無這個角標及正式佔用；現有統計 icon 不是 Full 標記。 | 8/8 Full 記一人 Absent／Sick／Pending 仍 8/8 Full，其他學生不變，老師主色不轉紅。 | 合法退課、退款與班額釋放屬 X-02；本列的不釋位規則已明確。 |
| C-06 已確認 | §5.5；§十/P-10 | Regular／Special／自訂 Class Type 有資格／調課規則，新班繼承。 | E-COURSE category／level 是分類文字，尚非 Class Type 規則。 | 建 Special「不允許學生自助調課」，新班繼承且學生 API 亦拒絕；Regular 依自身規則顯示合資格 Slot。 | 試課／補堂繼承、例外授權與覆蓋規則；不要把 category 當規則引擎。 |
| C-07 已確認 | §5.5；EX-06、08 | Slot 顯學生名單／人數，詳情顯年齡、剩餘堂數等。 | E-CLASS shared 名單空、計數「—」；E-LOCAL 僅示範列表。 | 用 300 名虛構 active 學生、6 課資料載入被授權班；點學生看到正確年齡／課包剩餘；跨老師及學生端一致，長名單不卡頓。 | 剩餘堂數的購買基礎與事件扣減見 §7.5／A-03，不能先用每堂自動減一。 |

## 試課、申請人及轉換（T，7 列）

| ID／來源狀態 | 來源節 | 業務效果 | 現有碼／缺口 | 可驗收場景 | 待確認 |
|---|---|---|---|---|---|
| T-01 已確認 | §3.1、13.4 | 開放時間、試課／調課資格、Total／Trial／Rescheduling 三配額及被排除學生。 | E-SCHEDULE 只有正式班次 capacity；E-DATA 無 AvailableSlot／資格／三配額。 | 設總8、試課2、調課1（虛構），不同資格只見可用 Slot；被排除學生不能通過 URL／API 使用；同時操作不超配額。 | 兩類可否同時開、總數與分配額如何相互約束、老師範圍；有方向而非任意自己定公式。 |
| T-02 已確認 | §3.1、§十一；EX-01 | Submit 立即佔 TrialQuota；Reject 立即釋放，歷史留存。 | E-LOCAL join 改示範佔位，不是正式 TrialRequest 交易。E-DATA 有一般交易／冪等工具，無試課配額服務。 | 1/2→另一人 Submit 成2/2；第三人及兩人同時競最後一位不得超額；Reject 成1/2，拒絕歷史可看；重試 Submit／Reject 不重複佔／釋位。 | 取消／改期配額如何回寫另待定；不能借 Reject 規則推導全部逆向操作。 |
| T-03 已確認 | §3.2；EX-01 | 申請通知＋可操作 To-do；老師見WhatsApp號碼並自行聯絡確認。 | E-TODO／正式申請及 WhatsApp 連結未接；現有網站工作室WhatsApp不是申請人聯絡。 | Submit 後只有相關老師可開申請、看家長號碼及自行WhatsApp聯絡；UI 清楚申請≠已確認試課，不稱後端已自動傳WhatsApp。 | 表格電話校驗、聯絡後試課確認狀態及失敗回饋（§十/P-05）。 |
| T-04 已確認 | §3.2、4.2；EX-02 | 試課結束未填結果，持續跟進待辦直至處理。 | E-TODO 無到時觸發／持續任務。 | 虛構12:00結束，時間過後產生唯一Trial Follow-up；刷新及另一授權分頁仍在；處理結果後關聯任務更新。 | 時區、觸發時機及歷史呈現可設計；不能只做一次toast。 |
| T-05 已確認 | §3.2、3.3；EX-02 | Absent／Enrollment Confirmed／Pending Follow-up，並支持改期；到場與報名意向分開。 | Leads 的 trial/enrolled 標籤不是 TrialRequest 狀態；正式到場／意向／改期服務缺。 | 同一人記錄實際Absent後仍可跟進意向；Enrollment Confirmed 不自動變正式學生；改期歷史連同原申請可追蹤。 | 是否另有聯絡確認狀態、改期通知及配額回收規則。 |
| T-06 已確認 | §3.3；EX-02 | 未按 Convert 一律 Applicant，即使試課完、Rejected 或報名確認。 | E-LOCAL studentList 以示範 paid/confirmed 篩選，沒有 Applicant 模型／轉名冊。 | 六種申請狀態均保留在Applicant；只有人工Convert後進入Student List；刷新／跨管理員結果一致。 | 完整姓名／家長／去重識別規則與重復轉換衝突回饋。 |
| T-07 已確認 | §3.3、7.5；EX-02 | Edit Details 與 Convert 獨立，字段承接、保留試課歷史，不重建重複檔案。 | E-LOCAL 有學生資料編輯，但非Applicant→Student轉換；共用Person／ConversionRecord缺。 | Enrollment Confirmed顯示兩個獨立按鈕；先補資料再Convert一次，已填字段與歷史完整；第二人／重試Convert不新增重復Student。 | Convert必填、是否綁定班／課包；Direct Enrollment的Confirm Request後可Convert已確認，付款先後綁定細節仍待定。 |

## 老師首頁待辦（D，5 列）

| ID／來源狀態 | 來源節 | 業務效果 | 現有碼／缺口 | 可驗收場景 | 待確認 |
|---|---|---|---|---|---|
| D-01 已確認 | §4.1、4.2；EX-03 | 首頁頂部類別＋數量，展開學生/申請後能直接處理。 | E-TODO 僅統計／今日課，無分類任務與正式關聯。 | Payment5／Reschedule3／Followup2顯示準確；展開五條各有狀態和可操作詳情，處理後計數即時更新。 | 類別內二級排序及歷史篩選；續報／新課程不要另造重復Payment任務類別。 |
| D-02 已確認 | §4.3；EX-03 | 老師各自排序任務類別並保存。 | 無Priority Settings；既有格距localStorage設定不等於個人任務排序。 | B把Payment第一、C把Reschedule第一；同賬號重載保持、互不覆蓋，移動後對應列表順序一致。 | 類別內順序細則。 |
| D-03 已確認 | §4.1、§9 | 行動事件同時即時通知和唯一To-do；普通成功只通知。 | toast基礎可重用；E-TODO 無可靠業務事件／持久任務／分類通知。 | 一個Trial／Payment申請只有一條關聯待辦，重試/重載不重復；保存普通資料不添任務；任務完成與業務結果同一次更新。 | 各事件通知接收者、失敗／重復投遞處理；通知本機測試通道與將來推送分開。 |
| D-04 已確認 | §4.3、6.3；EX-07 | 個別Pending Class Arrangement默認最高優先，但老師可調整。 | 無StudentSession Pending及待辦。 | A某堂Pending只產生一項，初次默認置頂；B調整分類後不被強制還原；任務快捷入口回同一待安排記錄。 | 未確認的二級排序不改變默認分類優先規則。 |
| D-05 已確認 | §6.1；EX-06 | 某學生某堂Absent生成跟進，附發送家長消息和Make Up入口。 | E-CLASS 無逐學生Attendance；E-TODO／消息／安排缺。 | 只把A設Absent，任務準確顯示學生/課次/狀態；連續重復提交仍僅一條，不為其餘四人生成任務；兩按鈕進入相同關聯資料。 | Absent後來改Present時任務完成／歷史處理；扣堂另見A-03。 |

## 出席及個別學生安排（A 3 列、M 4 列）

| ID／來源狀態 | 來源節 | 業務效果 | 現有碼／缺口 | 可驗收場景 | 待確認 |
|---|---|---|---|---|---|
| A-01 已確認 | §6.1；EX-05、06 | Admin和負責老師逐學生記錄Present/Late/Absent/Leave/Sick/Other。 | E-CLASS只有空Attendance欄／停用掃描入口，尚無記錄API及責任範圍。 | 已授權老師只改A的當天課堂狀態；其他學生/班額/Full不變；無權老師服務拒絕；Absent產生D-05。 | A-03扣堂政策，不得因狀態列表存在而默認扣堂。 |
| A-02 已確認 | §6.2；EX-08 | 每學生每課堂文字Remark與彩色Sticker分離，可控是否展示，長文折疊。 | E-SCHEDULE已有課堂文字remark/detail及換行；沒有StudentRemark／Sticker／逐學生展示開關。 | A150字備注摘要可展開，黃貼紙顯示於指定Slot但不覆蓋老師色/紅綠點；B/另一堂不被串改；無權數據不在DOM/API。 | 貼紙定義／可否自定義、多個顯示項及授權細則；不是老師主色。 |
| A-03 待討論 | §6.1、§十/P-02；EX-06 | Attendance對Remaining Lessons及補堂資格的作用必須另定。 | 無正式剩餘堂數賬本；不能沿用local示範lessonDates自動推規則。 | 政策確認後分別測試六種Attendance、回改/重復提交/補堂對賬；同事件不能重復扣堂。 | Absent、Sick、Leave、Late等逐項扣減/返還，未定前不可靜默執行。 |
| M-01 已確認 | §6.3、9.2；EX-07 | 學生行⋮保留精確按鈕名 **Make Up This Class**，統一調/補/延課。 | 舊requests是整份示範報名的轉class；無該學生該堂入口。 | 從Student Session菜單進入、從Absent和Pending To-do也回同一安排記錄；不另建Postpone重復業務。 | 按Class Type/學生的資格規則及權限需與T-01/C-06一致。 |
| M-02 已確認 | §6.3；EX-07 | YYYY-MM-DD日期Accordion內按時間排序資格Slot，顯示課程/顏色/人數。 | E-VIEW日/月視圖可重用日期工具，但無可安排Slot選擇器/資格服務。 | 篩2026-10-17只列資格Slot；按時間序展開，四位年份、正確課名/老師色/人數；無權/被排除Slot不能靠直接ID選。 | 配額可用人數的展示維度（總/調課）與跨課資格規則。 |
| M-03 已確認 | §6.3、9.2；EX-07 | Pending只改某學生某堂，不選擇新Slot、不改原Capacity／全班。 | E-SCHEDULE single/following改的是課堂本身，**不可拿來代替StudentSession Pending**。 | 五人班A某次Pending，其餘四人不變、原班佔用/Full不變、無目標預佔；唯一D-04任務持續可續辦。 | Pending最長保留、回取消/歷史規則未細化；不能先自行釋放名額。 |
| M-04 已確認 | §6.3、9.2、§十一；EX-07 | Confirm新Slot再校資格/容量，一次更新原/目標課次及所有相關老師/學生。 | 舊requests只改local班ID；共用StudentSession/Arrangement/Quota交易缺。 | A從B老師班安排到C班，兩老師與學生端、兩班名單同步；最後一位競爭只一人成功；失敗原安排/計數完全不變，重試不重復移動。 | §十/P-03：原位如何釋放、目標如何佔用、扣堂、跨課/延期/取消通知邊界；這部分不能僅由“同步”推導政策。 |

## 家長訊息（register/P，4 列）

| ID／來源狀態 | 來源節 | 業務效果 | 現有碼／缺口 | 可驗收場景 | 待確認 |
|---|---|---|---|---|---|
| P-01 已確認 | §6.4 | Send Message to Parent選WhatsApp/App、模板填充可編輯Preview。 | E-TODO/E-CLASS沒有此家長入口或接收關係；工作室WhatsApp鏈接不能復用作指定家長髮送。 | 從A學生菜單/Absent任務選家長；WhatsApp打開正確號碼並預填，取消Preview不發送；App方式確認後只有正確家庭收到，顯示實際發送人。 | 正文§十/P-08推送失敗處理；不宣稱WhatsApp後端自動送達。 |
| P-02 已確認 | §6.4 | Settings管理Preset Message to Parents，發送前可修改。 | Settings目前主要News；無模板服務。 | 保存兩個模板，另分頁重開一致；選模板填姓名/課次後編輯只改本次消息，不意外改原模板；長文本中英文可讀。 | 模板字段、安全替換規則、普通老師可維護哪種模板範圍。 |
| P-03 已確認 | §6.4、4.1 | 全部端Notification Centre分System與Message from具體Teacher/Sender。 | toast不是Notification Centre；無持久通知/發件人/已讀服務。 | 同時收申請系統通知與B老師消息，正確分類、接收範圍、發送人；重載不丟，重復事件不重復列表。 | 已讀/歷史保留/本機模擬推送及實際外部送達方式。 |
| P-04 待討論 | §6.4；§十/P-08 | 是否允許家長App內直接雙向回復尚未決定。 | 無雙向會話；不得用發送需求推斷批准聊天系統。 | 若確認，才補家長回復權限/發送人/通知/失敗場景；否則本次只驗已確認的發出流程。 | 雙向回復、會話範圍及送達失敗流程。 |

## 公開網站與時段（W，8 列）

| ID／來源狀態 | 來源節 | 業務效果 | 現有碼／缺口 | 可驗收場景 | 待確認 |
|---|---|---|---|---|---|
| W-01 暫緩 | §1.1、§十/P-12 | 公開Homepage既有大致設計，本需求暫不展開，和老師To-do首頁不同。 | 有現成Beamal公開畫面/圖片；不以此宣稱後台D列完成。 | 保留現有圖片/中英文/手機版，不把Homepage設計擴張加入當前主流程驗收。 | 後續何時恢復公開Homepage設計；SEO是未來方向。 |
| W-02 已確認 | §1.1 | Course Details顯示課程、課室、年齡、時長、內容與後台課包/價格。 | E-COURSE真費用可重用；E-PUBLIC仍3個示範course與Sample age，公開頁未接完整元數據。 | 按最新6課而非硬寫10課；3–18歲範圍內按課程實際適齡、課室/時長/內容/多種課包展示；後台改價後公共詳情同步；4/8/12/24僅測試例，不固定業務收費。 | 最新6課準確名稱/適齡/內容/課包及真實價格須以維護資料為準。 |
| W-03 已確認 | §1.1、3.2；EX-01 | 訪客先課程/資格Slot，再學生家長表格，提交TrialRequest。 | E-PUBLIC joinForm只有示範報名資料及class選擇，無完整Trial表格/正式配額。 | 沒選Slot不能跳過提交；填學生/家長名、生日、學校、介紹人、WhatsApp、電郵；Submit交易產生唯一申請、佔名額、通知和待辦。 | 必填/選填/校驗/家長與學生身份資料對應，見§十/P-05；不能照示例全部設required。 |
| W-04 已確認 | §13.1、13.4 | Course Details默認從正式Overall Slots自動同步Trial Slots。 | E-PUBLIC讀示範班次，未接可預約正式Slot；E-SCHEDULE不是試課Slot本身。 | Admin改正式TrialSlot，匿名公開同一ID時段更新；普通Rescheduling默認不出現；無另一個獨立公開時段庫。 | 合資格Slot關係及公開字段最小集；不得洩漏內部學生／備注。 |
| W-05 已確認 | §13.1、13.2 | Admin／授權老師僅控制現有Slot公開/隱藏，不能經公開編輯改內容。 | onlineStore是course/fee屬性，非每Slot公開權；無Public Visibility設置。 | 只給B公開管理權，能隱藏Slot但API改名稱/日期/容量被拒；無此權C無法改顯示；內部Slot事實未變。 | 公開權限授予具體範圍、UI式樣；字段不可改的原則已確認。 |
| W-06 已確認 | §13.1、13.4 | Public Visibility只是顯示層，不改資格、內容、內部預約規則。 | 尚無獨立public visibility層，不能重用schedule activityDeleted。 | 隱藏後後台仍同名/日期/人數/資格/歸屬；重新公開不產生新Slot、不清預訂；獲授權內部調課資格不因公開隱藏改變。 | 公開緩存更新／匿名數據邊界的技術方案。 |
| W-07 已確認 | §13.1；EX-05 | 試課配額滿默認公開隱藏；Show Fully Booked開啓後顯示Full但不能提交。 | E-PUBLIC只有示範正式free判斷，無TrialQuota與開關。 | Trial2/2默認隱藏；開設置顯示Full且服務端拒新申請；Reject回1/2後符合公開規則便恢復Available；學生Absent不恢復試課位。 | 此Full指TrialQuota，不能用正式班額/出席數取代；公開強制顯示不等於容許超額。 |
| W-08 已確認 | §13.1、13.5 | 公開時間表默認連續7天、最多30，可設，與內部1–14天獨立。 | E-PUBLIC無此範圍配置；內部Month亦不能算公開30天設計。 | 默認7天、設30天跨月正常顯示；內部仍可14天7×2；改變公開範圍不改內部日期選擇或Slot。 | 最短天數、30天網頁/手機排版。 |

## 備忘、代課與待定天氣／名額（TM 3 列、X 2 列）

TM 列來自 register 的後續補充，主文詳述在§17.2.4/17.2.5、EX-24/25；這裡只記錄與核心Timetable關係，薪金、假期審批和員工完整頁仍由擴展覆蓋清單處理。

| ID／來源狀態 | 來源節 | 業務效果 | 現有碼／缺口 | 可驗收場景 | 待確認 |
|---|---|---|---|---|---|
| TM-01 已確認 | register；§17.2.4；EX-24 | Admin/授權老師在日期或班次加純文字Remark，圖標/展開可讀；學生無此功能。 | E-SCHEDULE已能保存課堂remark且詳情換行；缺日期級備忘、備忘圖標/折疊及普通老師授權寫入。 | B為授權日期和某課堂各寫長文本，重載保留、只在正確範圍展開；學生不能創建/讀內部備忘，其他老師無權拒絕。 | 日期/班次備注的作者、編輯範圍與可見權限；不同於A-02學生備注。 |
| TM-02 已確認 | register；§17.2.4；EX-24 | 文字備忘獨立於Staff Leave、Attendance、To-do、名單/Capacity。 | E-SCHEDULEremark目前獨立文字基礎；其餘正式狀態模塊未接，尚不能算所有端一致通過。 | 寫「老師/學生可能缺席」，Leave審批、學生Attendance、人數/Full和To-do均不改變；只改變文字與其歷史。 | 正式留存/審計及備注可見性；不能自動識別文本觸發正式狀態。 |
| TM-03 已確認 | register；§17.2.5；EX-25 | 代課B同步個人/Overall Timetable並使用B主色，A請假標籤留存，人數/Full不變。 | E-RESOURCE可指派老師ID、E-SCHEDULE單堂更改可重用；未有賬戶關聯、老師色、Staff Leave/代課語義。 | A已請假，Admin指定B代一堂/試堂；B與Admin同步，主色換B，A假標籤保留；學生報名、人數/Full不變。 | 普通老師能否代班及授權；假期審批流程由擴展清單定，不能把一般teacherIds修改等同代課完工。 |
| X-01 待討論 | §8；§十/P-09；EX-15 | 惡劣天氣停課方向為復用可安排Slot與Make Up引擎，不重復做預約。 | E-SCHEDULE一般Delete/Undo不是天氣通知/補課。 | 政策確認後測選受影響堂→通知→合資格補堂，按班/個別分別驗；原歷史可追溯，取消/重試不重復。 | 發起權、全班與個人、通知先後、扣堂/資格與批量補課均未定。 |
| X-02 待討論 | §5.4、§十/P-03/P-04 | 已滿班強制Available、超額完成報名及合法取消後的名額處理另定。 | 舊bookable/free硬限制只是示範；新共用服務無正式名額引擎/覆蓋策略。 | 決定後驗強制狀態仍準確人數、併發超限處理/警告/審計、退課/取消/退款的唯一回寫；未定前不把綠點當通過名額校驗。 | 是否/怎樣允許超額、上限、警告、審批、退課/退款釋放原/目標位規則。 |

## 主文第七節付款聯動的核心門檻

F-01～F-07 的逐 ID 付款覆蓋由擴展清單承接；此處保留§7、9.3、§十一對核心課堂/學生的強制結果，不能在接Students/Accounting時遺漏。

| 動作 | 必須得到的結果 | 現有邊界與驗收 |
|---|---|---|
| Request to Pay | 建PaymentRequest並通知／待辦；尚未確認、尚未Paid。 | 舊join/payment示範不是正式申請；須用多Items、舊課/新課/下期費驗證。 |
| Confirm Request | 老師核對/改Items與最終金額後進入Awaiting Payment，並通知家長FPS聯繫付款；**不入班、不更新正式課表、不Paid**。 | 現有 `markPaid` 沒有此獨立步驟。虛構兩項100加第三項再改50，家長、老師與付款詳情看到同一最終版本。 |
| Convert to Student | 始終人工獨立；Direct Enrollment在Confirm Request後已可Convert，不必等到賬。 | T-06/07須與付款狀態獨立，不能以Paid作為是否正式Student的唯一判斷。 |
| Confirm Payment | 老師確認FPS實收後記錄Paid；課程項立即正式入班，更新名單/人數、相關師生課表、購買/剩餘堂數；非課程項不排課；**不自動Convert**。 | E-LOCAL `markPaid` 只改示範booking，E-DATA沒有共用支付/入班事務。驗證重試不重復入賬/入班及兩種Convert先後順序，失敗時不能只Paid而名單未更新。 |
| PDF Receipt | Request Details起按鈕常駐，手動Save/Send by Email；每次取最新金額版本；未實收只能明確Draft/Payment Details，不能Paid Receipt。 | 現有教材PDF預覽與Excel付款導出均不是收據/模板編輯。付款前文檔正式名稱/編號、快照與郵件技術待細化，不得自動發送。 |
| 到期提醒 | 老師設到期/頻率/開關；逾期通知但不自動停課/封賬號。 | 沒有付款到期/通知服務。測每日提醒去重、關停、生效後停止催款、逾期權限與課表不自動撤銷。 |

## 共同驗收資料與推進順序

以下為本機驗收用的**虛構資料規模**，不是讀取或複製真實學生資料：4位老師（包含Admin兼任授課場景）、300名active學生、6課、3–18歲；另加待轉換申請人、至少兩個老師互不授權的班次、一個跨老師調課案例、一個8/8正式滿班及Trial2/2滿Slot。實際課程內容/價格應可維護，不以本文件示例固定。

1. 先建立 Person／Applicant／Student、課程／班次／ClassSession、TeacherAccount↔授課身份／授權、AvailableSlot／三配額的關係。現有共用課程、排課、資源及版本工具可沿用；不能把所有實體都塞進示範db.bookings。
2. 完成 R-01 權限與 C-01 日期佈局、C-03/04/05視覺和正式人數，再驗 T-01/02/W-04～08 的同源公開Slot及**最終提交配額交易**。前端禁按鈕只能改善體驗，不能抵御兩人同時搶最後名額。
3. 用 EX-01/02 串起試課→持續To-do→明確結果→手動Convert；用付款表的三獨立動作串起正式入班。事務失敗／丟回覆重試應保持人數、申請、歷史與待辦一致。
4. 用 EX-06/07 驗 StudentSession Attendance／Pending／Make Up，特別核對五人班只改A、原班Full不變，以及雙方老師/學生/兩班名單同步；扣堂和釋放規則只在決定後加入。
5. 用 EX-03/08 驗個人優先級、消息/系統通知分類、折疊文字/貼紙；以4老師/300學生/6課做搜索、分頁/長名單、手機及跨身份流暢度。不能從「small fixture過」推導規模性能已通過。

本次交付是需求覆蓋文件。沒有宣稱上述場景已通過、整套Goal已完成、iOS已共用資料、SEO已做好，亦沒有增加生產部署或外部消息發送的要求。

## 2026-10-15 People 檔案基礎追加（限定完成範圍）

本節追加工程進展，保留上方 48 列的來源狀態與驗收門檻；不改全表 111 列的需求狀態或完成數。原 E-DATA、E-LOCAL、T-06／T-07 所述「尚無共用 Applicant 檔案」已有下列限定前置實作，Trial／Convert 等業務缺口仍在。

共用 [people.mjs](../../sample/server/people.mjs) 已保存獨立 Person 檔案與管理修改記錄，網站 Admin 的 Students 入口可切換 Students／Applicants 名冊、搜尋、排序、分頁、開啟檔案及 Edit Details。新增只建立 Applicant；可讀改既有 Student 的相容性由隔離測試資料驗證，沒有提供直接建立 Student 或 Convert 的操作。檔案 ID 不隨修改改變，Person 不因同名、同電話或同電郵自動合併，也不自動建立 login。

| 已有前置能力 | 對應需求的剩餘門檻 |
|---|---|
| Applicant 分類獨立於付款及登入；新增／修改後仍為 Applicant。 | T-06 未完成：未接 Trial Request 的六種狀態、申請結果及人工 Convert。管理員直接建立／歷史 Student 與 Convert 前置規則仍等使用者答覆。 |
| Edit Details 保留同一 Person ID、欄位及 `person.create`／`person.update` 的版本、操作者、時間與快照。 | T-07 未完成：這是管理修改記錄，並非 Trial History；Convert、試課歷史承接及其防重複仍缺。 |
| 現階段 People 的列表、直接 ID、History 及寫入都只允許 Admin。 | R-01 僅增加此模組的拒絕越權前置：Teacher／Student 的正式學生、家庭或申請關聯尚未定，兩角色目前 People API 返回 403；獲授權課程不能推導為獲授權全班學生。 |
| 已保存基本個人、家長／聯絡、兩組聯絡人、學校／推薦及備註等欄位；空日期與未選推廣偏好保持空值。 | W-03 的公開申請表、必填／身份驗證、Slot 選擇與 Submit 配額交易尚未完成。Admin 的顯示名稱必填只用作檔案識別，不是公開申請必填政策。 |

檔案中的 enrollmentDate／quitDate 是手動資料欄位；保存它們不建立 Enrollment、不扣堂、不改名額、付款或課表。出生日期用來顯示年齡；3–18 歲是最終測試資料分布，沒有擅自變成檔案硬性年齡限制。兩組聯絡人不等於已驗證家庭／監護人授權。

驗證證據分開記錄：

- 真 HTTP 已驗穩定 ID、跨 Admin 修改、版本衝突、固定重試 key、交易／修改記錄一致及重啟持久性；300 個隔離 Applicant 的查詢、排序及分頁已測，但不是 300 active 學生的完整工作流程或畫面負載驗收。
- 前端與 SDK 已驗保存／取消、遲到回覆不覆蓋較新版本、身份切換、當前 401／403 清私人快取、Back 不被舊回覆拉回、已提交搜尋焦點與未提交輸入保護；這些程式測試不是實際手機或 Teacher GUI 證據。
- Root 已實際操作 Admin Applicant 新增及 v1→v2 修改，兩組聯絡人、DOB／年齡 7、空日期、推廣偏好 null→明確 false 可讀回；另完成 Teacher 直連拒讀、第二 Admin 分頁、手機390中英文／鍵盤取消及未保存 Back。最後新查詢首畫面已顯示 Loading、不閃舊0筆；完整424/424（42.371秒）與隨後build2.28秒成功。較早420次結果與來源／程式／畫面界限見 [People 檢查點](people-profile-checkpoint.md)，不把限定拒讀當成完整家庭／Teacher人物授權完成。

Enrollment、Trial、家庭登入／激活、正式 Student 建立／Convert、付款、剩餘堂數及班內學生名單仍未由此切片完成；全規格與最終 4 老師／300 active 學生／6 課驗收繼續保留。

## 2026-10-15 Overall Available Slots 追加（部分能力，原48列不改）

上方「尚無正式AvailableSlot／公開讀示範班次」是原盤點基線，現由[本片規格](availability-spec.md)的獨立Slot與匿名投影取代。原48列、全111列來源狀態與完整門檻不變，不將帶依賴的整列標完成。

| 需求範圍 | 新增有限能力與仍未完成 |
|---|---|
| **R-03／T-01** | Admin保存獨立／linked Overall Slot、三容量與兩資格；linked讀實際sequence，Slot ID不借series ID。排除Student ID只供Admin API／原值保留，最終預約校驗、Total合算／Class學生扣額與Submit高併發仍缺。 |
| **R-01／R-04／W-05** | Teacher本人／grant只讀Slot，不收內部remark／exclusions；匿名更無私人ID／版本。Teacher指定範圍編輯及Public管理授權未建，Admin能寫不算整列完成。 |
| **W-04／W-06** | Course Details同正式Slot白名單投影；defaultTrial／hide／show／全域Rescheduling分開。顯示不改內部內容，未建Reservation動作，公開可見不等於可預約交易已完成。 |
| **W-07** | TrialFull預設隱藏、開關顯Full，公開Course不因七日內Full假消失；隔離held fixture已驗。真Submit競位、Reject回復、Absent不釋位仍待Trial業務，不能把顯示測試算整列全過。 |
| **W-08／C-01** | 公開固定7天／前後7日，日期query revision隔離；內部1–14天保留。公開最大30配置／最短天數未完成，正式Student課表仍需Enrollment。 |
| **W-02／W-03／T-02～07／D-01～05／M-01～04** | 正式Course名稱／分類／程度與時段入口已有；介紹／適齡／價格發布、訪客表格、Submit配額交易、結果／通知／To-do／Convert／逐學生調課仍缺。shared舊Join／Paid封閉，不借示範成功替代。 |

三容量配置不推導兩類加總或Class佔位公式；新Slot兩類無預約是已知0，Total／ClassOccupied未知保持null。Total與Trial必填問題已提具體選項但仍待答，不任意設required或全部可選；相依Submission未開放，其他可獨立工作繼續。

證據：15新flow／3SDK／15pureUI／11真Slot HTTP＋9既有Teacheraccess通過；獨立前端全檔260／260。Root完整468／468、69.7004秒、exit0已提供，首次build3.90秒成功；468／此build是後續sidebar與changed paint修正前，最後重跑及真正畫面仍待結果；詳見[Availability檢查點](availability-checkpoint.md)。三項詳情／opening／unchanged競態有RED→GREEN，不能換算整列完成。111項、4老師／300 active學生／6課全流程大檢查未完成。

本片後續最新全套重跑為 **445／469，24 fail**（`/tmp/beamal-availability-final-test.log`），Root正在修正；上方468／首次build保留為先前結果，不代表目前來源已全過。最後重跑及build仍待提供，不用指定案例通過掩蓋最新完整失敗。

限定grid恢復只在Availability頁後，獨立前端全檔已真正重跑 **261／261，8.3393秒、exit0**（flows240＋SDK21，保留全部舊斷言）；完整npm及最新build仍待Root提供，不能將這個前端套件當作全套通過。

**最後完整測試更新：** 上方445／469失敗及首次468結果保留為歷史；限定修正後Root已真正重跑 **469／469，56.8668秒、exit0、0 fail／cancel／skip／todo**（`/tmp/beamal-availability-final-green-test.log`）。隨後最後build仍進行，不沿用首次3.90秒作最新build。Root已有Admin同Slot ID建立／改17:00／hide→default、真正Teacher唯讀、匿名同ID及無內部remark、全域Rescheduling展示、public390中英文及英文Admin表單有限畫面證據；Cancel／Back、匿名Hide、最新側邊導航等仍待補。Chrome中斷後17:00以無cookie HTTP／內建瀏覽器核對，linked／Full fixture畫面與300 active未宣稱通過；完整界限見[檢查點](availability-checkpoint.md)。

## 2026-10-15 C-03代表色追加（不改原48／111來源列）

原C-03沒有正式老師色的基線，現已新增Teacher representativeColor與單人有效指派投影，五檢視／詳情使用同一色，未設定／legacy維持原底色。多老師主色政策待答，姓名色樣只是識別，不能將整C-03標完成；資源／Slot來源tuple與linked晚ACK review已修正、永久回歸通過。精確6flow（原5＋補1）／7helper／5resourceUI／16AvailUI／20HTTP及267前端（3.9728秒）、最後完整490／490（44.7252秒）與依序build2.81秒成功。限定真GUI確認同老師保存／清除、Teacher唯讀、普通課＋linked有效單堂換老師、390雙語不保存操作；colour-only局部更新保焦點，指派變更仍按R-01清舊scope。匿名HTTP含revision改色前後相同；黑／白持久保存及多人主色未驗，集中[檢查點](teacher-colour-checkpoint.md)記錄。原48／全111來源狀態不變，R-01不放大權限，C-04／05正式Full與學生／Trial／Total／Convert、300 active大檢查均不由本片完成。
