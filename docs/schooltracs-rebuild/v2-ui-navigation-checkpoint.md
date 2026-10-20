# Goal v2.5既定範圍：V13／V14會計與報告UI進度

日期：2026-10-15（香港）。只記進度；Goal文件、版本及來源manifest不變。沒有建立Goal、Commit或push。

## 最新有限證據（V13／V14；Goal文字與範圍保持v2.5）

本輪只記已驗UI進度，不修改Goal三檔、版本、範圍或來源manifest。Goal仍是階段A；兩個新增切片均為部分完成，非全頁／全Goal完成。真IAB及Chrome由主Agent操作回報，本文件更新者只核對日誌／圖片存在與資料一致性。

| 證據／切片 | 已驗範圍 | 明確限制 |
|---|---|---|
| V14-E-FULL-TESTBUILD | 最後完整869/869、exit0、fail/cancel/skip/todo全0；V13 build exit0，804.97kB／PDF495.58kB | 其後只修VM測試注入、產品code與build相同，故不重跑build；chunk警告仍在，非效能驗收 |
| V13-E-ACCOUNTING-ENTRY／UI-V2-15 | module42＋host44合86；新獨立8＋3及舊11。正式4host先RED後GREEN。1280中文動態新增／刪中行，摘要273、Review返回保notes/focus/scroll239；390英文INV2價285×4−10=1130，錯誤修正後Enter Review，Back保unitPrice焦點/scroll171.5，Cancel原1120 | 最後提交disabled，防偽submit不改data；operations示例，未共享保存／付款／記帳。手機Review直排後價額已重驗，不代表會計全頁完成 |
| V13-E-REPORTS-CATALOG／UI-V2-16 | 原19完整名稱／description保留＋Course Payment Summary第20項；正式13／獨立10。目錄真IAB390英文／768英文／1280中文無溢出、20disabled、側欄收起、console空；768英文doc768、四groups一列左右20/748，Clock欄採獨立events | 正式20入口仍disabled；子頁只有受控renderer，未驗真入口、查詢、子頁GUI、數字／對帳或匯出。此階段例外不能當完整任務通過 |
| V13-E-SCHOOL-SALES | 真Chrome來源Sales Q見All／Single、Search student及Save／Pay停用，已回原Timetable | 沒有實際學生，未能完整checkout，不聲稱來源保存／付款已驗；無來源業務寫入 |

### 失敗、畫面及證據界線

- 最後全測：`/tmp/beamal-v14-final-test.log`；同產品程式build：`/tmp/beamal-v13-final-build.log`。V13曾868/869：flows VM未注入reportsPageMarkup造成sidebar測試失敗及unhandled；修VM import/injection後4sidebar targeted及V14全部綠。這是測試harness問題，不是瀏覽器runtime。原失敗在`/tmp/beamal-v13-final-test.log`，修後在`/tmp/beamal-v13-reports-host-wiring-green.log`。
- Accounting正式4host先0/4 RED、再4 GREEN：`/tmp/beamal-v13-entry-host-red.log`、`/tmp/beamal-v13-entry-host-green.log`。更早`/tmp/beamal-v13-entry-host-test-syntax.log`是test-key語法錯，不能冒充產品RED。
- Accounting獨立及合併target：`/tmp/beamal-accounting-entry-independent-v1.log`、`/tmp/beamal-accounting-entry-independent-host-v1.log`、`/tmp/beamal-accounting-independent-entry-host-module-regression.log`；舊期間／文件11項回歸保留。Reports：`/tmp/beamal-reports-independent-formal-target.log`、`/tmp/beamal-reports-independent-final.log`。
- 真IAB bound Payment／Credit固定INV2／Isla；Pay80 Review／Back／Cancel回原INV2。清單Pay空白選INV2即更新Isla。這只是示例表單/核對/返回，沒有實際收款或寫入。
- 圖片：`/tmp/beamal-v14-invoice-review-1280-zh-final.png`（最新code桌面，兩行278−5=273）、`/tmp/beamal-v13-invoice-review-1280-zh.png`（先前桌面）、`/tmp/beamal-v13-invoice-review-390-en-final.png`（手機Review最新）、`/tmp/beamal-v13-reports-390-en.png`、`/tmp/beamal-v13-reports-1280-zh.png`；來源`/tmp/beamal-v13-schooltracs-sales-selection.png`。
- 原124項來源／111原Status（92／9／9／1）、496個非UI欄及26個UI盤點保留；新增兩個開發UI切片至16，不能當作功能完成數。Goal三檔SHA與manifest完全不變，沒有重開Goal、改版本或範圍。

### 下一步

沿用原Goal及已有檢查點續做尚未完成UI；不要重做已驗切片。會計最後提交／shared帳務、Reports真入口／查詢／輸出／對帳，以及Staff與其他未驗UI及完整主流程仍待，不能因本輪869測試或目錄齊備便結案。

## 先前檢查點原文（V11及更早；全部保留為歷史）

以下最新／下一步只代表當時版本，不能覆蓋上方V13／V14限定證據。

# Goal v2.5：學生窗口與會計期間／文件返回 UI 檢查點

日期：2026-10-15（香港）。僅整合限定證據；Goal仍是階段A，沒有建立／修改Goal工具、宣告完成或Commit／push。

## 最新有限證據（V8–V11；Goal v2.5，2026-10-15）

Goal仍在階段A，沒有宣告全UI或業務完成。以下真IAB／Chrome是主Agent限定操作回報；本文件更新者核對日誌、來源版本及圖片存在，沒有另行操作瀏覽器、DB或外部服務。

| 切片／證據ID | 已驗範圍 | 限制／下一步 |
|---|---|---|
| V11-E-FULL-TESTBUILD | 凍結版最後npm test847/847、build exit0；host40＋module37合77/77，會計獨立11/11 | main795.25kB／PDF495.58kB，chunk警告仍在；效能未驗收，不代替全UI/保存/對帳 |
| V8-E-STUDENT-COLD-WINDOW | cold首次載入、正式2窗口race RED→GREEN、獨立9/9；IAB 127新分頁My classes7含11/7、My requests月6→My classes7。實際768/1280 Review→Back保date/reason，Cancel回exact opener；768留白16px、1280表單760px置中 | 是授權載入窗口，不是全部歷史；Submit disabled、附件/保存/老師待辦未接，無DB寫入 |
| V11-E-ACCOUNTING-PERIOD／UI-V2-14 | 月/季/年/custom與精確記錄/unknown回歸；真IAB custom10/12–13 Query Isla：invoice1/payment1/credit0，Enter已修正通過；To10/11錯誤保輸入/舊合法結果，修正成功；2025空→2026全年恢復3 | operations示例記錄，非shared帳款；不是正式會計口徑、業務保存或報表對帳完成 |
| V11-E-ACCOUNTING-DOCUMENT-RETURN | 真390 Email→Preview→Back保subject/body、body scroll141與Preview email焦點；Escape→options→exact INV2→清單，焦點INV2、custom/Isla保留。Save filename→Preview→Back亦保留。768表格scroll811/client734、doc768、ArrowRight scrollLeft6；390 doc390 | 未生成PDF、未寄Email、無DB業務寫；create/edit動態items及真正Review/最後submit仍待。console error/warn空為本次限定觀察 |
| V11-E-SCHOOL-ACCOUNTING | 真Chrome來源Invoices/Receipts皆0資料；Invoices Awaiting/dateType/FromTo/Apply及10/1–31日期顯示，Receipts七欄已觀察，已回原Timetable URL | 空資料不能證明detail/計算/保存；未改來源業務資料 |
| V11-E-SOURCE-V25 | Goal438行、Launch161行、comparison187行；111來源狀態92/9/9/1無實質變動。p.5剩下1堂與p.6尾2…兩處續報線索並列，不硬編1/2 | 原稿優先、Notion相容延伸；功能方向已定，預設/適用範圍等細節待核，不是程式完成 |

### 日誌、圖片及歷史失敗

- 最後整合：`/tmp/beamal-v11-final-test.log`、`/tmp/beamal-v11-final-build.log`；限定target：`/tmp/beamal-v11-accounting-targeted.log`、`/tmp/beamal-v11-independent-accounting.log`。host40含其他host流程，不能把77項全說成77個會計情境。
- V8 baseline828/828及build：`/tmp/beamal-v8-final-test.log`、`/tmp/beamal-v8-final-build.log`。V10曾845/847、2項舊英文複數regex不接受正確的Showing 1 record：`/tmp/beamal-v10-final-test.log`；修正測試語法後V11全部綠。保留失敗，不以舊通過取代最新結果。
- 學生正式窗口2個race先RED後GREEN：`/tmp/beamal-student-window-race-formal-red.log`、`/tmp/beamal-student-window-race-formal-green.log`；獨立9：`/tmp/beamal-student-window-race-independent-review.log`。cold首次載入亦有正式red/green，詳JSON證據索引。
- 會計GUI先發現Enter無效，Apply由typebutton改原生submit後，用相同custom/Isla流程重驗通過；這不是只跑測試後推定GUI正常。
- 圖片：`/tmp/beamal-v10-accounting-filter-1280-en.png`（英文Showing 1 record已修，768表格nowrap改動前，但1280本來正常）、`/tmp/beamal-v11-accounting-table-768-zh.png`（最新表格）、`/tmp/beamal-v10-accounting-email-back-390-en.png`（後續只有表格CSS改動，Email畫面未變）、`/tmp/beamal-v8-student-review-768-en.png`。
- 僅保留真實有限結論：會計資料目前不是shared帳務；PDF／寄件只走介面與Preview，沒有生成／寄出／持久保存成功。Student申請最後提交及附件仍停用。
- 124來源原ID/原文/Source/Status與歷史引用保留；26UI區域保留，新增第14個UI切片。function、role_scope、persistence_recovery、performance共496個非UI欄位不因本輪UI證據升級。
- Goal v2.5仍先全UI；受控示例只驗依賴未接成功寫入的結果頁，清單/詳情/輸入/Review仍須真入口，不能假submit或把全系統按鈕停用。

### 下一步

1. 先完成Accounting create/edit的動態items、完整Review、取消/返回/錯誤保草稿及精確來源；未接最後submit如實停用。期間/單據/收款/credit與PDF父層返回不能視作整頁完成。
2. 接續Reports／Staff及其餘UI盤點；Reports階段A按鈕暫停用的例外不等於最終放棄報表查詢/輸出。需要的source與政策逐項核對。
3. 完整Student申請保存、附件、老師待辦，Family/Trial/激活/Convert，Products共享保存、通知、出席/調補堂、Clock/薪金、會計共用帳務/報表對帳仍未完成。
4. People此前僅Admin指定何凱晴Family/Trial有限IAB；老師工作台舊Chrome偶發無反應的工具/產品原因，本輪未取得足夠新證據結案，不因這次IAB正常便宣稱已修。其餘角色/中英/尺寸及整體效能繼續驗收。

## 先前檢查點原文（v2.4及更早；全部保留為歷史）

以下本輪／最新／待做只代表當時版本；以本頁上方V11摘要為現況，不以舊失敗或通過當現在結論。

# Goal v2.4：課程、People、產品及角色 UI 檢查點

日期：2026-10-15（香港）。只整合有限證據；Goal仍在階段A，不建立或更新Goal工具、不宣告完成。本次文件更新未Commit／push。

## 最新有限證據（V5/V6；Goal v2.4，2026-10-15）

Goal仍在階段A，完整UI與業務未完成。以下真Chrome／IAB項目是主Agent的限定操作回報；本文件更新者核對日誌與檔案存在，沒有重新操作網站、DB或來源服務。

| 切片／證據ID | 已驗範圍 | 限制／下一步 |
|---|---|---|
| V6-E-FULL-TESTBUILD | 中間整合版完整npm test 825/825、build成功；早於Trial records一行標籤校正 | 最新整合全測／build待重跑；main780.80kB／PDF495.58kB，chunk警告未解，效能未量度／非完成 |
| V6-E-PEOPLE-CONTEXT／UI-V2-13 | 指定Profile四入口精確ID、禁fixture；unknown帳戶不假未激活，未接final disabled／無假complete；404/403、換身份、Applicant→Student閉窗，metadata更新／noop保focus與scroll。UI76/76、host27/27、獨立UI4/4＋host5/5 | People真Chrome尚待；不是整個Student／Family／Trial／Account功能完成 |
| V6-E-PEOPLE-IAB-LIMITED | 既有IAB的Admin→何凱晴：Family只顯同人＋未知提示＋disabled Add，Escape回同人／Family焦點；Trial記錄同人，無Chloe fixture | 僅此人物／兩入口；其他角色、activation、響應式及Chrome待驗。標籤另校正為「試課記錄／Trial records」，最新整合待重跑 |
| V5-E-PRODUCT-LIST-GUI | 11項、價升序、10筆／頁、page2；Cancel Edit仍原名／168價格，返回同頁及篩選。390中文、768英文、desktop中文 | 7筆臨時UI產品reload後清除回原4；無DB寫入，不宣稱390英文／共用保存通過 |
| V5-E-STUDENT-REQUEST-GUI | 真Chrome先重現typed date/reason按Next後變空並修正；桌面與390英文Review／Back／Sick→Reschedule保2026-10-23與reason，Escape返opener | 提交及附件disabled，申請寫入／老師To-do／附件仍未接；當時target42，現在完整825含新回歸 |
| V5-E-AUTH-OWNERSHIP／V5-E-ACCOUNT-MENU-TESTS | 登入兩race及public link跟身份獨立10＋2；menu正式16＋獨立4。老師本輪真Chrome登入／Logout正常，menu曾可開 | 目前teacher-home連一般按鈕亦偶爾無反應，root與獨立Agent正分辨工具／產品；暫不標menu GUI通過，不冒稱舊native問題根因已解 |
| V5-E-SCHOOL-STUDENTS-ACCOUNTING | 來源Students與Accounting皆0records，只看Create Student及All Dates popup | 未保存／付款，未驗期間結果或來源全功能 |
| V6-E-SOURCE-V24 | 原稿9頁重新分工目視後修正私人班非手作、FPS only；Goal與comparison現實SHA／行數已核對 | 同課題方向已定；課題識別、週期／日期窗對應及例外待定，不把整方向待決；不是程式完成 |

### 日誌、畫面與驗收界線

- 中間整合版全測：`/tmp/beamal-v6-final-test.log`；build：`/tmp/beamal-v6-final-build.log`。兩份結果早於Trial records標籤校正，最新程式仍待重跑全測／build。
- People：`/tmp/beamal-v6-people-independent-target.log`、`/tmp/beamal-v6-people-independent-ui-boundaries.log`、`/tmp/beamal-v6-people-independent-host-target.log`、`/tmp/beamal-v6-people-independent-host-boundaries.log`。
- Products：`/tmp/beamal-v5-products-detail-390-zh.png`、`/tmp/beamal-v5-products-page2-desktop-zh.png`。
- 學生申請：`/tmp/beamal-v5-student-request-review-390-en.png`、`/tmp/beamal-v5-student-request-review-desktop-en.png`。
- 登入：`/tmp/beamal-public-login-final-independent-target.log`、`/tmp/beamal-public-login-independent-boundaries.log`；menu：`/tmp/beamal-account-menu-final-target.log`、`/tmp/beamal-account-menu-independent-boundaries.log`。
- 來源：`/tmp/beamal-v5-schooltracs-create-student.png`、`/tmp/beamal-v5-schooltracs-accounting-date-range.png`。空帳戶不能證明排序／期間計算／真業務已全驗。
- 124來源列、111原Notion狀態、26個UI區域保留；UI、function、role_scope、persistence_recovery、performance分欄，本輪後四欄沒有因程式測試而升級。
- 先前775、731及其他數字保留作歷史；825是標籤校正前的中間版，不能當最新完整測試，也不代替真GUI、共享保存、正式權限或完整Goal。
- Goal v2.4的階段A例外僅適用依賴成功寫入的結果頁受控示例；清單／詳情／輸入／核對仍須真入口。不得假submit或籠統停用全部UI。

### 下一步

1. 已有何凱晴Family／Trial限定IAB證據；接續People其餘IAB與真Chrome：指定第二人／同名不同ID、Applicant與Student、unknown／404／403、身份變更、metadata／草稿、取消／Escape／Back及實際手機中英；不新增正式業務資料來冒充UI驗收。
2. 排查老師工作台偶發所有按鈕無反應，分開工具輸入、開發重載與產品行為；保留可重現證據後才判根因或GUI通過。
3. 下一Accounting UI片處理月／季／年／custom期間、多項開單與精確ID／詳情返回；不擅定cash／earned、應收／實收或退款政策，不把未知當零。
4. 全26區及相關子頁繼續逐片驗收。Products共享保存、Trial／Family／激活／Convert、學生申請保存、通知、出席／調補堂、報告、Clock／Payroll等核心功能仍待完整Goal接線與驗收。

## 先前檢查點原文（v2.2；全部保留為歷史）

以下「本輪／最新／待做／服務PID」只代表當時檢查點，不是V6現況；舊缺口已由上方更新，不將歷史成功或失敗當現在結論。

# Goal v2.2：課程、名冊、產品及角色 UI 檢查點

日期：2026-10-15。分支 `test`，現有未提交工作保留；本輪沒有 Commit／push。Goal 仍在階段 A（先全 UI），不是全系統完成報告。


## 最新整合進度（2026-10-15，階段 A）

下方「早段紀錄」保留當時觀察；最新狀態以本節及 JSON 任務清單為準。沒有把局部 UI、測試數或文件覆核當完整 Goal 通過。

| 切片 | 有限完成證據 | 仍待工作 |
|---|---|---|
| 課程／Fees／時間表返回 | 明示可解除的 Course 條件，處理舊老師／課室／課型畫面篩選；課程／Fees 返回保留來源條件、月份、展開、焦點，Back／Forward 有 scoped 回歸及早段真 Chrome 限定操作 | 全角色、所有檢視／長資料及相關完整功能仍逐項驗收 |
| 名冊／訂單／報讀 | 創意繪畫 10/16 #1 的現行 13:30 名冊 → 加入學生／查看 Chloe 訂單 → Cancel／Escape 返回同堂及入口；歷史訂單 13:00 明示按開單快照，不誤當現行課表 | 本片沒有新增、Send、付款或改名額；完整單據及交易鏈另驗 |
| 報讀表單響應式 | 修正390手機底部按鈕落到畫面外：固定頭尾、單一body捲動。320×568、390×844、768×1024、1280×900及844×390實際CSS尺寸已量；長內容可捲到底，無整頁橫溢，All=實際3堂而非固定4堂 | 效能／全部表單狀態仍待；此處不證明付款與名額功能全通過 |
| 表單焦點及草稿 | Lessons選單更新後保原控制焦點及body捲動；外部焦點不被搶。2個新增回歸；獨立17/17加busy鍵盤1/1，錯誤保草稿 | 後續新增程式須用新全測，不引用舊結果當最新版 |
| Fees 未來新價 UI | 既有Fee現價／關聯課程／新金額／生效日期，子畫面Cancel返回原Fee草稿與條件；Save停用，歷史資料未提供時不造值 | 排程保存、價格歷史及相關政策仍未完成，非minor |
| Products詳情返回 | 早段37個相關targets及Chrome390中英/768：detail→edit／stock→Cancel／X／Escape回原產品，然後回清單 | 共用服務/真保存仍未接；本輪新排序/分頁另驗 |
| Leo工作台／請假 | 真Chrome核對本人與兩課關係；未接To-do如實未提供。四假期、AL/補假unknown、disabled提交灰色及not-allowed、自然reason草稿與Escape焦點，中英/實際390CSS已核 | 持久待辦、Leave保存/審批/代課、Clock及Payroll未完成 |
| Chloe日期窗及自己的課堂 | 本輪真Chrome學生身份：Oct6課→View timetable→November→My requests顯11/7水彩；申請帶Chloe、Leo及正確日期。My classes列7啟用課節含11/7，390選頁側欄收起/無整頁橫溢 | My classes仍是現有未來365日窗口，並非完整歷史UI；申請寫入/老師待辦/附件未完成 |
| 學生申請自然流程 | 正修共享申請的工程preview文案及假complete，edit→review→back保草稿，最終提交/上載未接時明確停用 | 獨立review找到loading草稿、偽造view、撤權launch3個邊界，修正與最終重驗中，未標通過 |
| 登入時序 | 已以真正action順序的隔離harness重現：慢登入離開FAQ仍被拉回、舊catalog等待阻住登出後另一帳戶登入；job所有權修正及相關22+API26targets通過 | 獨立review、真UI及新整合待驗；不是舊native click問題根因證明 |
| Products清單 | 新增五欄排序、10/20/50筆、計數/頁碼/前後頁、篩選重設/頁界夾取，Operations24/24（4新）通過；不改stock orders或API | 獨立review、真UI長清單、焦點及新整合待驗 |

### 測試版本及實際畫面界線

- 早段凍結版完整 `npm test --prefix sample` 775/775，`npm run build --prefix sample`成功：`/tmp/beamal-v3-final-test.log`、`/tmp/beamal-v3-final-build.log`。這早於本輪學生申請／登入／產品新改動，不能稱最新版全通過。
- Build仍有主bundle約760KiB／PDF約496KiB警告，尚未完成整體效能驗收；沒有調高閾值掩蓋警告。
- 兩個原服務仍是 PID45569（API 5180）及45587（Vite5173），已以lsof當前監聽核實，沒有因觀察timeout重新啟動，亦沒有重設DB。
- 早段學生頁按鈕／原生details曾不動；本輪原agent分頁已清空，以同一Chrome browser的新127分頁成功操作My requests及Account menu，確認Chloe身份。該舊情況目前未重現，不能把已確認的兩條login競態冒稱為其根因。
- 390手機尺寸在該Chrome站點90%縮放下以viewport351×760取得DOM實測390×844；記CSS實測值，非只信要求值。臨時override每次換來源/結束前還原。
- 本輪截至目前沒有正式DB業務寫入、報名、付款、改權限、寄件或參考網站資料修改。產品presentation測試若新增，另記是否僅當頁draft。

### 新鮮 SchoolTracs 對照

- Timetable保留可見 `Course: Q` 按鈕，不能把未記錄badge誤稱參考沒有課程篩選。
- Q的2026-10-15 #2 10:00–10:45名冊→Enroll student→Close返回同堂及焦點，表單有student搜尋與Enroll first, Pay later。只採返回上下文，不照搬Beamal未採用付款政策。
- 本輪Products Overview實見Normal、Search、Category、Code/Name/Detail/Remark/Online Store/Created date排序button；現來源帳戶0產品，所以未驗排序結果或分頁，不冒稱完全比對。
- Manage stock是另一stock orders清單，Type/Status/Transfer stock/Receive stock與產品總覽分開；本輪Beamal只補產品清單，不擅增整個庫存單流程。
- 參考Products的Name操作未提供th aria-sort；Beamal應給清楚排序方向，不複製這個可近用缺口。觀察與改善理由分開記。
- 保存來源圖 `/tmp/beamal-v4-schooltracs-products-overview.png` 後已循入口返回原Course Q時間表；無新增、保存、刪除或付款。

### 最新仍須接續

1. 凍結三片新改動，完成獨立review、新全tests/build及真Chrome中英/390/768/1280、正常/失敗/取消返回/焦點。
2. 學生申請的載入不能丟同身份草稿，真正換身份/撤權必須清；未接功能不能假complete。表單尚未接通不等於申請整項完成。
3. Products長清單分頁、排序、篩選與detail/edit/stock返回及焦點實驗；此UI仍不能代替共用Products保存。
4. Admin指定人物工作區仍有generic工具可能帶第一個fixture，須以真person/session傳上下文；Account／Accounting期間與動態多項開單、家庭、通知、報告與Staff其餘UI接續。
5. 已見舊QA資源／教材名如Teacher 1、Fictional shared timetable QA20261014及Beamal教材QA20261014，仍是客戶示範品質缺口；先私有可復原盤點，不盲刪未知資料。
6. 全部26個UI區域（含新補登入/身份切換）仍是盤點及分片狀態，沒有宣告整個A階段或完整Goal完成。

## 早段紀錄：當時任務與來源

| 任務 | 使用者需要 | 本輪狀態 |
|---|---|---|
| UI-V2-02 | 從課程指定日期查看正確課堂名冊，明確編輯另有入口，返回原月份及日期焦點 | 已有程式及回歸；Back 缺口修正中，最終畫面待本輪整合後重驗 |
| UI-V2-05 | 名冊 → 訂單／加入學生 → 取消／關閉返回同一堂，保留閱讀位置 | 實作及回歸進行中；不改付款生效或名額政策 |
| UI-V2-08 | 產品詳情 → 編輯／調整庫存 → 錯誤可修正 → Cancel／X／Escape 返回原詳情，再回原篩選清單 | 四檔 UI 切片及獨立程式審查 37／37 通過；真正瀏覽器及響應式待整合凍結後驗收 |
| UI-V2-09 | 老師知道待辦是未提供，還是真正沒有工作 | 修正共用待辦 readiness，不以空陣列冒充「沒有待辦」；目標測試 28／28，獨立 adapter 測試 9／9；Chrome 已核對 Leo 中英工作台及 Clock 提示／Escape 焦點 |
| UI-V2-10 | 費用可表達未來生效的新價，分清現價與舊訂單 | 已補官方來源研究；UI／排程保存仍待實作與政策確認，不列 minor |

### SchoolTracs 當次觀察

- Chrome 已登入參考系統。Timetable → Q（2026-10-15 #2，10:00–10:45）→ Enroll student：表單保留課程、日期及時間。按 Close 返回同一課堂名冊，焦點回 Enroll student。沒有新增、報名、付款或保存來源資料。
- 參考表單可見 Enroll first, Pay later；這不是 Beamal 的付款政策。Beamal 依已確認要求，人工 Confirm Payment 才正式啟用課程；此切片只採用返回上下文，不照搬付款選項。
- 參考系統 Fees 的現有費用行點擊後 URL 出現 `viewDialog=true`，但當次未呈現編輯彈窗；清除舊彈窗路徑後仍未取得表單。未將此當作 Beamal 阻擋或猜測新價保存行為。
- [SchoolTracs 官方：Schedule a price change](https://beez.zendesk.com/hc/en-us/articles/4407822943117-Schedule-a-price-change)，頁面更新 2026-07-28，核對到 Fees → 選費用 → Schedule new pricing、新金額與生效日期，按新訂單開始日期採用新價。這是官方文件證據，不冒充當次動態保存實測。已確認訂單歷史價格仍按 Goal 保護，未確認訂單重算、生效邊界等另列待決。

### 本機及證據界線

- 現有服務：網站 `http://localhost:5173`，共用服務 `http://127.0.0.1:5180`；已確認原 process 正在監聽，沒有重設資料庫。
- 本輪修正前的完整測試日誌 `/tmp/beamal-v2-first-ui-test.log`：731／731 通過。新增修正後須另跑完整測試與 build，不能引用這份舊結果當整合完成。
- 真 Chrome Leo 帳戶讀到創意繪畫及水彩探索；IAB Chloe 帳戶讀到相同 Leo、課程及 2026-10-16 13:30／10-17 10:00 等現有課節。這是關係讀取證據，不代表全校 300 人報讀、跨角色寫入或全部權限已重驗。
- 老師工作台未接通待辦時，顯示「待辦事項暫未提供／Tasks are not available yet」；不以此修正代替持久待辦功能。Clock 確認保持停用，未建立正式打卡紀錄。
- IAB 尺寸控制需核對實際 CSS 寬度：本次要求 1024×720 時，DOM 實測 1280×900。驗收以 DOM 實測值記錄，不能只按要求值命名截圖。暫時尺寸覆寫於本輪結束前還原。
- 開發期間 Vite 更新會重載畫面及關閉未保存彈窗；最終 GUI 驗收等程式凍結後重做，避免將開發重載誤判為產品返回缺陷。

## 早段當時待做（已由上方最新進度更新，不直接當現況）

1. 凍結本輪程式，完整 tests／build，獨立審查及真瀏覽器驗收課程／名冊／訂單返回與產品 Cancel／X／Escape、錯誤、焦點、中英及實際 390／768／1280 CSS 寬度。
2. 課程 → 時間表應明示 Course 篩選並暫存／解除相衝突的舊老師、課室及課型畫面篩選；返回保留原上下文，不能擴大服務授權。
3. Fees → 關聯課程 → 返回 Fees 應保留原搜尋、篩選及焦點，目前課程返回仍傾向 Courses。此與名冊／訂單返回是另一段，不能混報已修。
4. 補費用新價、生效日、歷史版本的 UI；不以現價修改表單假裝已完成排程。
5. 學生 My classes／My requests 的完整日期窗口及六筆截斷仍須接續核對，不能因已看到 Chloe 部分課堂而當全部歷史完整。
6. Products 共用服務、持久待辦、逐學生出席／調補堂、家庭、通知、會計／報告及員工等核心功能仍按完整 Goal 追蹤，先完成全 UI 再接剩餘功能。

不以程式審查、測試數量、少數畫面或本文件記錄代替整頁／整套系統驗收。

## 2026-10-15 員工 UI 補充證據

最新有限進度見 [員工 UI 驗收紀錄](staff-ui-acceptance-20261015.md)：返回上下文、四來源真重試、未知資料狀態、手機分頁及三角色讀取；883／883、build 通過。只記開發及驗收進度，沒有改 Goal。Staff、全 UI 及全系統均未完成。
