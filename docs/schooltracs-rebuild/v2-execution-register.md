# Goal v2.5 執行協調與 UI 現況清單

日期：2026-10-15（香港）。延續既有active Goal，仍是階段A先全UI；本文件不建立／修改Goal工具。完整來源與原文在 [JSON清單](v2-execution-register.json)，限定證據詳見 [檢查點](v2-ui-navigation-checkpoint.md)。

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

## 1. 來源及計數

- 現行[Goal v2.5](ULTIMATE-GOAL-PROMPT.md)：最新使用者決定 → PDF明確要求／結果 → 相容Notion延伸 → SchoolTracs查證 → 工程建議。
- 111項原Notion ID／Source／Status／Key Rules／URL完整保留：92已確認、9待討論、9待細化、1暫緩；來源狀態不是開發進度。加13 PDF-GAP共124列，26個UI區域；都不是完成比例或固定產品分母。
- 原Notion snapshot及歷史coverage不改寫；新的來源複核僅記版本與採用規則。三個mock身份屬同一四老師／300學生／六課程群體，不因示例會計記錄存在就宣稱與共享學生交易連結。
- Notion已確認Convert／Paid兩種順序；待決是先Paid後Convert綁定與可見性，不把方向降為可選。私人班/FPS only保留；續報p.5剩下1堂/p.6尾2…不硬編預設，保留可設定方向並核實範圍。

## 2. v2.5 來源協調

| 裁定 | 關聯ID | 現行規則 | 未定邊界 |
|---|---|---|---|
| V2-C01 人工公開課表與自動同步 | R-03, R-04, W-04, W-05, W-06, PDF-GAP-09 | 保留人工維護、預覽及更新，入口能定位/修改對應正式時段；自動帶入減少重填，Show/Hide不代替全部維護能力。公開可預約格須有真實課次、資格及名額。 | 只改公開時間不改正式時段仍待定，不擅建第二套互相矛盾的可預約事實。 |
| V2-C02 公開Regular/Trial/Full及日期視圖 | W-04, W-07, W-08, PDF-GAP-09, PDF-GAP-13 | 原稿常規課表/滿額/新客報名保留；Notion Trial預設與Full顯隱作附加視圖，不令Regular永久消失。內部1–14日、公開7–30日和每週時段表分開。 | 預設公開組合及Full顯隱無一致證據則待決；不照舊一律隱藏或強制六十日。 |
| V2-C03 自動單據保存/測試寄件＋手動工具 | F-04, F-05, F-11, F-12, F-13, S-03, PDF-GAP-09 | 自動出單/Email並保存於家長帳戶是必要能力；Save/Send/模板/預覽/歷史下載作額外工具，不作替代。生成/保存/排件/寄件獨立可追蹤，Paid須核實收款。 | 自動觸發/重寄/版本待確認；不得用Submit/ParentConfirm/Slip上傳當Paid，只用本機測試outbox。 |
| V2-C04 老師續報跟進＋家長提醒 | D-01, D-03, S-07, PDF-GAP-02 | 老師有可續辦待辦、對應學生/課包、聯絡意向及下期單；家長提醒並行，不能替代老師前置跟進，未有PaymentRequest仍可需要跟進。 | p.5有剩下1堂、p.6有尾2…兩處門檻線索，不硬編1或2；保留已確認可設定Remaining方向，精確預設/適用範圍、接收範圍/完成/去重待核。不自動續費或真發WhatsApp。 |
| V2-C05 推薦/個別/產品/訂單優惠與Coupon | F-02, F-08, F-09, O-01, PDF-GAP-03, PDF-GAP-08 | 保留推薦來源及下次使用；計價引擎可共用，但來源/對象/可用已用狀態及歷史不能混成一欄。 | 自動發獎/有效期/疊加/退款/可否分次抵扣未定，不造儲值餘額，不硬編折數。 |
| V2-C06 Postpone與統一Make Up路徑 | M-01, M-02, M-03, M-04, PDF-GAP-04, PDF-GAP-12 | 同課題調課方向已定；可共用Make Up This Class入口，但延期/Pending/追蹤/續辦結果保留。家長受限的比賽班、故事書、私人班及Trial仍可聯絡老師安排；手作班是舊誤讀，不作限制依據。 | 待決是課題識別、課題與教學週期/日期窗的映射及跨課題/週期特批；截止/扣堂/原目標名額依相關確認政策。不把同課題方向整項待決，不擅定同曆週或任意日期皆可。 |
| V2-C07 原課程資料與4/300/6示例 | W-02, C-07, S-02, PDF-GAP-05, PDF-GAP-11 | 同群體四教師含Maya、300active含Chloe、六courses，3–18歲是驗收分布；十課/2.5歲不成為全局限制。分鐘/次數/期間及組合內容分開。 | 40/45分鐘、組合排扣補、分鐘餘額與實際課程資料待確認。 |
| V2-C08 Homepage暫緩與必要公開任務鏈 | W-01, W-02, W-03, PDF-GAP-01, PDF-GAP-09 | 保留W-01來源暫緩；先管理系統UI，但公開課程→時段→試課表及簡化課表仍屬本機最終鏈。重用Beamal現有頁。 | 正式部署/SEO/native iOS本輪不做；品牌首頁擴展不混同必要申請鏈。 |
| V2-C09 舊Leave父項與已確認子項 | ST-06, ST-14, ST-15, ST-16, ST-17, ST-18, ST-19, ST-20, ST-21, ST-22, ST-23, TM-03 | 保留ST-06原待討論，但四種Leave、兩入口、History/Overlay及逐堂代班已確認部分不可整批延後。 | AL/補假/待遇/證明/代課衝突與通知待定；不自動取消整班、亂派人或扣薪。 |
| V2-C10 原始功能出處與討論細則 | ST-01, ST-05, ST-11, F-08, D-05, P-01, PDF-GAP-01, PDF-GAP-10 | 原Source逐字保留；GPS100m、詳細Payslip/計薪、自動唯一待辦等另記後續討論，不冒稱PDF逐字原文，也不否定相容已確認規則。 | 精確對話確認證據不足時標待核。 |
| V2-C11 register/P與正文P索引 | P-01, P-02, P-03, P-04, PDF-GAP-10 | 本表P-01～04是notion-register家長消息；正文§十/P-xx只是待決索引，不能混ID。 | 無新增商業決定；引用須保留命名空間。 |
| V2-C12 舊minor/架構/路線圖按v2協調 | F-04, F-05, F-10, F-11, F-12, F-13, O-03, ST-07, PDF-GAP-01, PDF-GAP-06, PDF-GAP-07, PDF-GAP-08, PDF-GAP-10 | 先全UI再功能；付款PDF/附件/自動寄件/權限不可列minor。架構新增大量login/負載案例不是現況，不能重建三帳戶群體。 | 外部付款/寄送/部署未授權；舊端口、缺口、失敗/通過不是當前結論。 |

原Source／Status不改寫；舊相反文字按v2.5協調。功能方向與待定算法分開，不一次詢問全部問題。

## 3. 同一中心資料及證據邊界

- 四老師包括Admin兼老師Maya、Leo、Ava、Ethan；300 active包括Chloe；六courses不是六Class Type。3–18歲是示例分布，不是排除2.5歲的產品規則。
- 沿用admin@gmail.com、teacher@gmail.com、student@gmail.com三個本機帳戶，不在此複製密碼，不授權外部Gmail；並發Admin測試用獨立會話或隔離測試，不增加常駐帳戶。
- relational-demo是歷史基線：Chloe兩筆模擬Paid、七課節，其餘299當時僅名冊；本文件未讀DB重驗，不稱300已付款／並發。新增測試Paid須走模擬FPS及人工Confirm Payment，不直接改DB湊數，不重建既有歷史。
- 穩定ID，不按姓名／電話猜配；來源未接／失效／未知不得借fixture，不把連結當激活。Accounting本片仍operations示例，不當正式共享帳款、收入或報表對帳。

## 4. 階段A切片任務

| 任務 | 起點與操作 | 驗收及限制 | 狀態／fresh證據 |
|---|---|---|---|
| UI-V2-01 課程→詳情→Fees方案 | Admin選既有課程，看Fee/單位/期間，新增修改後取消，回原搜尋/月份。 | 沿用課程、不改既有價或資料；三模式及雙語不裁切，不假保存。 | 部分完成；限定來源返回/條件/BackForward已實作及早段GUI，整頁待驗；V3-E-FEES-RETURN |
| UI-V2-02 課程指定堂→查看/名冊 | 從課程某月某一堂查看名冊；明確編輯另入口，授權老師也能查看。 | series+sequence/date定位，查看不寫，不因無編輯權失去已授權閱讀，關閉回同堂。 | 部分完成；名冊/報讀返回及響應式已有早段GUI，完整開單與付款另驗；V2-E-ROSTER-RETURN,V3-E-ENROL-RESPONSIVE |
| UI-V2-03 指定堂→時間表→原課程返回 | 定位某堂，含舊老師/課室/ClassType filter可能藏目標，再返回原課程。 | 保月份/展開組別/filters/捲動/焦點；不擴權；1–14日7x2及各視圖手機可用。 | 部分完成；限定來源返回/條件/BackForward已實作及早段GUI，整頁待驗；V3-E-FEES-RETURN |
| UI-V2-04 排課編輯→範圍→取消 | Admin改草稿，看單堂/往後範圍後Cancel/Escape/Back；老師查看同堂。 | 取消不寫且草稿/身份正確，單堂/整套意圖清楚，不默認未定超額/扣堂。 | 待核/待製作； |
| UI-V2-05 名冊→Chloe訂單→關閉返回 | 同Leo課堂開Chloe訂單或加入學生，再關閉返回。 | 同堂名冊保留；學生/Fee/課次/金額清楚；未Paid不入班，自動/手動單據UI分開。 | 部分完成；名冊/報讀返回及響應式已有早段GUI，完整開單與付款另驗；V2-E-ROSTER-RETURN,V3-E-ENROL-RESPONSIVE |
| UI-V2-06 三角色同群體及載入失敗 | Admin/Leo/Chloe獨立登入既有本機帳戶，看同群體課次及正確範圍，包含延遲/錯誤/重開。 | 不把299名冊當Paid，不顯假家庭/餘額/零人；沒有fresh證據不稱同步重驗通過。 | 部分完成；Student cold/window正式及獨立回歸/新分頁7堂與month6→7 IAB通過，完整跨角色同步/權限/保存仍待；V4-E-STUDENT-WINDOW,V3-E-LEAVE-GUI,V8-E-STUDENT-COLD-WINDOW |
| UI-V2-07 三條來源協調主鏈 | 核對人工公開維護預覽、自動單據保存/寄件、老師續報＋家長提醒的入口及狀態。 | 不只Show/Hide、只手動Send或只家長提醒；先UI，不私定trigger。 | 待核/待製作； |
| UI-V2-08 產品詳情返回及列表排序/分頁 | 詳情/編輯/庫存取消返回保原產品；排序分頁保查詢 | 詳情/編輯/庫存取消返回保原產品；排序分頁保查詢 | 部分完成；V5真Chrome11筆排序/分頁/篩選/詳情取消返回已驗，共用保存與整頁待驗；V3-E-PRODUCT-RETURN,V5-E-PRODUCT-LIST-GUI |
| UI-V2-09 老師工作台未提供與真空結果 | 未接待辦不顯假零；工作台身份正確 | 未接待辦不顯假零；工作台身份正確 | 限定切片部分完成；持久To-do仍未完成；V2-E-TODO-READINESS |
| UI-V2-10 費用未來新價子畫面 | 現價/生效日/歷史版本分清；取消保父草稿 | 現價/生效日/歷史版本分清；取消保父草稿 | UI部分完成；排程保存/歷史未接，非minor；V3-E-FEES-RETURN |
| UI-V2-11 學生申請核對及未接提交 | 精確學生課次、編輯/核對/返回保草稿；禁止假成功 | 精確學生課次、編輯/核對/返回保草稿；禁止假成功 | 部分完成；新增768/1280 IAB Review/Back/Cancel保原date/reason與exact opener；寫入/附件/老師待辦未接；V4-E-STUDENT-WINDOW,V5-E-STUDENT-REQUEST-GUI,V8-E-STUDENT-COLD-WINDOW |
| UI-V2-12 登入舊請求與新導覽/身份 | 慢登入離開不強制跳；登出換身份不被舊job阻住 | 慢登入離開不強制跳；登出換身份不被舊job阻住 | 部分完成；登入兩race/public link及menu程式獨立回歸通過，老師偶發無反應/menu GUI待核；V5-E-AUTH-OWNERSHIP,V5-E-ACCOUNT-MENU-TESTS |
| UI-V2-13 People指定人物入口及未知帳戶狀態 | Admin指定person的試課/Applicant Convert/家庭/帳戶入口全程精確ID；未載入/撤權/換身份不借fixture，資料變動正確更新。 | People UI76、host27、獨立UI4/host5；unknown帳戶不假inactive/activated；未接final disabled/無假complete；404/403/換身份/Applicant→Student閉窗，metadata更新/noop保focus/scroll。IAB限定何凱晴Family/Trial同人及Escape返回已驗；其餘角色/響應式/activation/Chrome與完整業務待驗。 | 部分完成；程式/獨立review及Admin指定何凱晴Family/Trial限定IAB通過，其餘GUI/Chrome待驗；整個Student/Family/Trial/Account未完成；V6-E-PEOPLE-CONTEXT,V6-E-PEOPLE-IAB-LIMITED |
| UI-V2-14 會計期間、精確記錄及文件返回 | Admin在月/季/年/custom期間查示例單據/收款/credit，以精確ID開詳情與PDF選項；Save/Email/Preview逐層返回保草稿、日期、查詢及opener。 | host40+module37合77、獨立11；真IAB custom Enter/錯誤保舊結果/Year空再恢復、768表格自身鍵盤捲動、390 Email/Save逐層返回草稿及焦點。Invoice/Payment/Credit依示例來源日期分列，unknown不造零。 | 限定UI部分完成；本片期間/精確記錄/文件返回保留；新增/編輯另見UI-V2-15，operations仍非shared帳款，最後submit/PDF生成/保存/寄送/對帳未完成；V11-E-ACCOUNTING-PERIOD,V11-E-ACCOUNTING-DOCUMENT-RETURN |
| UI-V2-15 會計entry動態items與Review返回 | 新增或指定Invoice編輯動態items，選正確Invoice作Payment/Credit，核對Review後Back/Cancel保草稿、焦點及原紀錄。 | module42+host44合86；正式4host RED→GREEN；獨立8+3及舊11。真1280中文及390英文動態行/摘要/錯誤/Enter/Review/Back/Cancel，手機價格全可見；最後disabled及防偽submit不改data。 | 限定UI部分完成；operations示例非shared帳款，未保存/付款/記帳，整個Accounting未完成；V13-E-ACCOUNTING-ENTRY |
| UI-V2-16 Reports目錄與受控子畫面 | 原19報告名稱/說明保留並加入Course Payment Summary；目錄按Sales/Enrollment/Product/Staff分組，為未接查詢子頁保留受控renderer。 | 正式13/獨立10；20正式入口disabled。真IAB390英文/768英文/1280中文目錄無整頁橫溢、側欄收起、console空；獨立Clock events欄不自動配對。 | 限定UI部分完成；受控renderer不等於真入口/子頁GUI；查詢、數字、對帳、匯出未驗，Reports全頁/功能未完成；V13-E-REPORTS-CATALOG |

主序與範圍沿用原Goal；既有切片及證據保留，不因本輪進度重做。

## 5. 全26個UI入口盤點

| 區域 | 子畫面／狀態 | 風險／政策 | UI／功能 | fresh證據 |
|---|---|---|---|---|
| 課程清單/詳情/教材 | 清單搜尋篩選排序、一般/刪除、詳情一般/教材、新增修改/還原及費用關聯 | 課程context、生命週期、跨頁返回 | 部分完成；限定切片有證據，整頁未通過／待核 | V2-E-ROSTER-RETURN,V3-E-ENROL-RESPONSIVE,V3-E-FEES-RETURN |
| 費用/計價方案 | 三計價模式、新增修改、多課連結、月數/期限/Minutes或Visits | 不從截圖猜價格生效與歷史政策 | 部分完成；限定切片有證據，整頁未通過／待核 | V3-E-FEES-RETURN |
| 內部時間表/指定堂/名冊 | 日週月列表/1–14日7x2、filters、詳情/名冊、單堂/往後表單 | series+sequence/date、查看不進編輯、返回保context | 部分完成；限定切片有證據，整頁未通過／待核 | V2-E-ROSTER-RETURN,V3-E-ENROL-RESPONSIVE,V3-E-FEES-RETURN |
| 老師工作台/待辦 | 自己的課堂、待辦分類/排序/直達、Clock | 共用指派/待辦持久，不能獨立假資料 | 部分完成；限定切片有證據，整頁未通過／待核 | V2-E-TODO-READINESS |
| 學生時間表 | 自己的日期/課堂/申請、月/連續日 | 只顯示獲授權孩子，不顯全班私隱 | 部分完成；新分頁恢復學生窗口7堂/requests月6與延遲race已驗；非全部歷史/寫入驗收／待核 | V4-E-STUDENT-WINDOW,V8-E-STUDENT-COLD-WINDOW |
| 學生資料/課程歷史 | 個人及中英文姓名、課包單位/期間、家庭切換 | Chloe真連結，未有餘額不造零 | 待核／待核 | 無 |
| 學生/Applicant名冊 | 300人搜尋排序分頁、兩Contact、詳情編輯History/Convert | Profile/Login/Family/Enrollment分開 | 部分完成；指定人物UI/host/獨立review及Admin何凱晴Family/Trial限定IAB通過，其餘GUI/Chrome待驗／待核 | V6-E-PEOPLE-CONTEXT,V6-E-PEOPLE-IAB-LIMITED |
| 家庭/激活/重設 | 關聯孩子、AddFamilyMember兩路、激活/重設 | 不按電話猜配，監護/激活前置待決 | 部分完成；Admin何凱晴Family同人/unknown/disabled Add及Escape焦點已IAB驗，其餘家庭/激活UI與功能待驗／待核 | V6-E-PEOPLE-CONTEXT,V6-E-PEOPLE-IAB-LIMITED |
| 試課申請/跟進 | 選課/Slot→表格、狀態/Reject、試課後結果 | 最後Trial位、結果/Convert分開 | 部分完成；Admin何凱晴Trial記錄同人/禁fixture已IAB驗，標籤校正為Trial records；完整試課/Convert未通過／待核 | V6-E-PEOPLE-CONTEXT,V6-E-PEOPLE-IAB-LIMITED |
| 調課/病假/延期/補堂 | 指定孩子某堂、日期Accordion、Pending/確認/取消 | 資格/扣堂/名額未定，不自動釋位 | 部分完成；768/1280 IAB Review/Back草稿及Cancel exact opener已驗，提交/附件/老師待辦未接／待核 | V2-E-STUDENT-LESSONS,V4-E-STUDENT-WINDOW,V5-E-STUDENT-REQUEST-GUI,V8-E-STUDENT-COLD-WINDOW |
| 逐學生出席/Remark/Sticker | 名冊逐人狀態、文字貼紙、缺席跟進 | 個人狀態不改全班Full/其他人 | 待核／待核 | 無 |
| Sales/PaymentManagement | 家長Request/老師Send、Items/日期/All-Single、回應及付款 | Request/ParentConfirm/Paid/Convert分開，回名冊 | 部分完成；限定切片有證據，整頁未通過／待核 | V2-E-ROSTER-RETURN,V3-E-ENROL-RESPONSIVE |
| PDF/Slip/模板/寄件 | 自動出單保存測試寄件、手動下載補寄、Template/Preview/Slip | 不是教材PDF；trigger/版本待定 | 部分完成；僅Accounting示例Save/Email Preview草稿及父層返回UI；未生成PDF/未寄件/未保存歷史／待核 | V11-E-ACCOUNTING-DOCUMENT-RETURN |
| Coupon/推薦/個別/產品優惠 | 模板/派發/來源、下次使用、可用/已用及明細 | 不造儲值餘額或未定獎勵/疊加 | 待核／待核 | 無 |
| 產品/庫存 | 查詢分類、詳情新增修改、價/數量/位置/已查證庫存 | Tax/Cost/網店/照片深規則是候選 | 部分完成；11筆清單真Chrome限定尺寸/返回已驗，共用保存與整頁仍待／待核 | V3-E-PRODUCT-RETURN,V5-E-PRODUCT-LIST-GUI |
| 會計 | 單據/收款/調整/狀態及追溯交易 | cash/earned/退款稅務口徑不猜 | 部分完成；新增/精確Invoice編輯/Payment/Credit動態items及Review返回已限定IAB驗，最後submit停用；operations示例非shared帳務/保存／待核 | V11-E-ACCOUNTING-PERIOD,V11-E-ACCOUNTING-DOCUMENT-RETURN,V13-E-ACCOUNTING-ENTRY |
| 報告 | Sales/Enrollment/Product/Staff、月季年/Product-CourseSummary | 階段A清單掣暫禁用，B再功能對帳 | 部分完成；20項目錄390/768/1280 IAB與controlled renderer程式已驗；20正式入口disabled，真查詢/子頁GUI/匯出/對帳未驗／待核 | V13-E-REPORTS-CATALOG |
| 員工/帳戶資料範圍 | 在職/全部、搜尋詳情、任教/個別權限/登入帳戶設定 | 真映射與示範細項分開，view/cancel不寫 | 待核／待核 | 無 |
| 假期/代班 | 四種假、申請/直接登記、審批/History/AffectedSessions/逐堂代班 | 不取消整班/亂派人/自動扣薪 | 部分完成；限定切片有證據，整頁未通過／待核 | V2-E-LEAVE-UI,V3-E-LEAVE-GUI |
| 打卡/薪金/Payslip | Clock結果/History、外勤Photo/Reason、Scheduled/Actual/審核 | 模擬非實機；費率/待遇/異常配對待決 | 待核／待核 | 無 |
| 通知/家長訊息 | System/Teacher分類、未讀、指定收件/模板/預覽/測試投遞 | toast不是持久通知，未外送不稱送達 | 待核／待核 | 無 |
| 活動/課程資訊發布 | 保存/發布、Website/Portal、Competition/Workshop | 發布/雙渠道政策待定，保留資產 | 待核／待核 | 無 |
| Leads | 清單Stage/Owner/Source/Comments、新增修改、Columns | 三橫線拖把/顯隱/非拖動等效操作 | 待核／待核 | 無 |
| Settings/Channels/News | 老師課室/ClassType/模板/偏好/News/外部狀態 | 低頻設定不擠TT，未連外如實標示 | 待核／待核 | 無 |
| 公開課程/簡化課表 | 課程→時段→Trial、Regular/Trial/Full、人工維護預覽更新 | 不只Show/Hide，公開可約須真實依據 | 待核／待核 | 無 |
| 登入/登出/身份切換 | 登入等待/失敗/防重按、導覽意圖、登出換身份、過期回覆 | 舊登入不能跳離新頁或阻住新身份；不殘留上一人資料 | 部分完成；job/public link/menu程式回歸通過，老師偶發無反應與menu真GUI待核／待核 | V5-E-AUTH-OWNERSHIP,V5-E-ACCOUNT-MENU-TESTS |

## 6. 原Notion 111項逐列

原文在JSON完整保留；本表用原題目／Status／Source，不以執行結果改來源。角色／恢復仍待核，效能未量度。

| ID／原題目 | 原Status | 原Source | UI／功能 | fresh證據 | 待決邊界（歷史輸入；先套v2.5） | v2／PDF映射 |
|---|---|---|---|---|---|---|
| A-01 逐个学生 Attendance | 已确认 | PDF 第3页 | 待核／待核 | 無 | A-03扣堂政策，不得因狀態列表存在而默認扣堂。 | — |
| A-02 Text Remarks + Color Stickers | 已确认 | PDF 第3页 | 待核／待核 | 無 | 貼紙定義／可否自定義、多個顯示項及授權細則；不是老師主色。 | — |
| A-03 Attendance 扣堂规则 | 待讨论 | 对话补充 | 待核／待核 | 無 | Absent、Sick、Leave、Late等逐項扣減/返還，未定前不可靜默執行。 | PDF-GAP-11 |
| C-01 时间表选择1至14天 | 已确认 | PDF 第2页 | 待核／待核 | 無 | 核心規則明確；窄屏具體呈現可設計但不能改成單排 14 欄。 | — |
| C-02 Timetable Preset / Custom Filters | 已确认 | PDF 第2页 | 待核／待核 | 無 | AND／OR、空條件、敏感資料可見性及自訂欄位的組合方式。 | — |
| C-03 Teacher Color Coding | 已确认 | PDF 第2页 | 待核／待核 | 無 | 同堂多老師時採哪個主色或多色呈現，正文未定；不可由現有多選資料自行假設。 | PDF-GAP-13 |
| C-04 Capacity、自动 Full 与覆盖 | 已确认 | PDF 第2页 | 待核／待核 | 無 | 強制 Available 後能否超額及退課釋位政策未定；顯示綠點不能繞過未決的最終配額校驗。 | — |
| C-05 红绿点与容量不受出席影响 | 已确认 | 对话补充 | 待核／待核 | 無 | 合法退課、退款與班額釋放屬 X-02；本列的不釋位規則已明確。 | — |
| C-06 Class Type Rules | 已确认 | PDF 第2页 | 待核／待核 | 無 | 試課／補堂繼承、例外授權與覆蓋規則；不要把 category 當規則引擎。 | PDF-GAP-04 |
| C-07 Slot 学生详情与剩余堂数 | 已确认 | PDF 第2页 | 部分完成／待核 | V2-E-ROSTER-RETURN,V3-E-ENROL-RESPONSIVE | 剩餘堂數的購買基礎與事件扣減見 §7.5／A-03，不能先用每堂自動減一。 | V2-C07, PDF-GAP-05, PDF-GAP-11 |
| D-01 Teacher Homepage 分类待办 | 已确认 | PDF 第1页 | 部分完成／待核 | V2-E-TODO-READINESS | 類別內二級排序及歷史篩選；續報／新課程不要另造重復Payment任務類別。 | V2-C04, PDF-GAP-02 |
| D-02 老师自订优先级 | 已确认 | 对话补充 | 待核／待核 | 無 | 類別內順序細則。 | — |
| D-03 即时通知 + 待办联动 | 已确认 | 对话补充 | 待核／待核 | 無 | 各事件通知接收者、失敗／重復投遞處理；通知本機測試通道與將來推送分開。 | V2-C04, PDF-GAP-02, PDF-GAP-12 |
| D-04 Pending Arrangement 最高默认优先级 | 已确认 | 对话补充 | 待核／待核 | 無 | 未確認的二級排序不改變默認分類優先規則。 | — |
| D-05 Absent 自动跟进 To-do | 已确认 | PDF 第3页 | 待核／待核 | 無 | Absent後來改Present時任務完成／歷史處理；扣堂另見A-03。 | V2-C10 |
| F-01 Request to Pay Items | 已确认 | 对话补充 | 部分完成／待核 | V2-E-ROSTER-RETURN | 各 Item 類型、金額／名額報價版本及先付款後 Convert 的資料綁定。 | — |
| F-02 老师修改 Items 与 Amount | 已确认 | 对话补充 | 待核／待核 | 無 | 老師改價與 Coupon 重算、重審及單據版本策略。 | V2-C05, PDF-GAP-03, PDF-GAP-08 |
| F-03 Confirm Request 与 FPS 收款分离 | 已确认 | 对话补充 | 待核／待核 | 無 | 付款前文件名稱及先 Confirm Payment 後 Convert 綁定。 | — |
| F-04 PDF Template Editor | 已确认 | 对话补充 | 待核／待核 | 無 | 模板個人／全校權限、可編輯佈局及未付款版式。 | V2-C03, V2-C12 |
| F-05 常驻 PDF Receipt 按钮 | 已确认 | 对话补充 | 待核／待核 | 無 | 未付款文件正式名稱、編號與版本留存。 | V2-C03, V2-C12, PDF-GAP-09 |
| F-06 学费到期及提醒频率 | 已确认 | 对话补充 | 待核／待核 | 無 | 全局／個別規則、頻率上限、重複提醒及時區。 | — |
| F-07 Confirm Payment 触发排课与堂数更新 | 已确认 | 对话补充 | 待核／待核 | 無 | 先 Paid 後 Convert 的資料綁定／家長可見性；退款、撤銷、扣堂。 | PDF-GAP-11 |
| F-08 Coupon Templates 与派发 | 已确认 | PDF 第5页 | 待核／待核 | 無 | 派到學生／家庭、有效期、使用次數與授權老師。 | V2-C05, V2-C10, PDF-GAP-03, PDF-GAP-08 |
| F-09 Coupon 自动扣减 Payment Request | 已确认 | 对话补充 | 待核／待核 | 無 | P-21：重用、疊加、超額、改價及退單恢復，未定條件不自行假定。 | V2-C05, PDF-GAP-03, PDF-GAP-08 |
| F-10 FPS Payment Slip Upload | 已确认 | PDF 第5页 | 待核／待核 | 無 | P-22：格式、大小、替換／去重、掃描及 Uploaded 子狀態；不實際對外發 WhatsApp。 | V2-C12 |
| F-11 Preset Email Templates | 已确认 | 对话补充 | 待核／待核 | 無 | 模板個人／全校範圍、權限與發件人。 | V2-C03, V2-C12 |
| F-12 PDF Receipt → Save / Send by Email | 已确认 | 对话补充 | 部分完成／待核 | V11-E-ACCOUNTING-DOCUMENT-RETURN | 接正式服務／系統分享的方式、誰最終發送、失敗重試及版本保存。 | V2-C03, V2-C12, PDF-GAP-09 |
| F-13 Receipt邮件附件技术方案 | 待细化 | 对话补充 | 待核／待核 | 無 | 待細化：provider、憑證／權限、發件人、最終確認、重試與送達狀態。 | V2-C03, V2-C12, PDF-GAP-09 |
| FAM-01 Family Group 多名学生共用账户 | 已确认 | PDF 第5页 | 待核／待核 | 無 | 家庭交易共用視圖及多監護人權限。 | — |
| FAM-02 老师端建立兄弟姐妹双向关联 | 已确认 | 对话补充 | 待核／待核 | 無 | 解除關聯、監護驗證、誰有權操作。 | — |
| FAM-03 Student Profile 与登录Account分离 | 已确认 | 对话补充 | 部分完成／待核 | V6-E-PEOPLE-CONTEXT,V6-E-PEOPLE-IAB-LIMITED | 與既有 Family Login 連結及先 Paid 後 Convert 綁定。 | — |
| FAM-04 Activate Account 安全激活与重设 | 已确认 | 对话补充 | 部分完成／待核 | V6-E-PEOPLE-CONTEXT | 一次使用／限時屬建議安全保護；監護驗證及 FAM-05 激活前置條件仍待確認。 | — |
| FAM-05 首次账户激活的付款前置条件 | 待讨论 | 对话补充 | 待核／待核 | 無 | 待討論：Paid前置 vs Convert獨立可激活。 | — |
| FAM-06 Add Family Member 两条报读路径 | 已确认 | 对话补充 | 待核／待核 | 無 | 非監護人關聯及資料驗證。 | — |
| FAM-07 新家庭成员试堂流程 | 已确认 | 对话补充 | 待核／待核 | 無 | Trial資格、拒絕釋放、延後審批與關聯驗證由core共同驗。 | — |
| FAM-08 新家庭成员直接报名付款 | 已确认 | 对话补充 | 待核／待核 | 無 | 先Paid後Convert的記錄綁定與顯示。 | — |
| FAM-09 付款确认及手动学生转换 | 已确认 | 对话补充 | 待核／待核 | 無 | 先付款臨時身份關聯、退款逆向與家長可見性。 | — |
| FAM-10 同家庭新学生不再创建独立Login | 已确认 | 对话补充 | 待核／待核 | 無 | 多監護人及家庭解除關係。 | — |
| FAM-11 家庭关系验证与多监护人 | 待细化 | 对话补充 | 待核／待核 | 無 | 待細化：Family ID設計、身份證明、兩家長、解關聯、電話變更權限。 | — |
| M-01 Make Up This Class 统一入口 | 已确认 | PDF 第3页 | 待核／待核 | 無 | 按Class Type/學生的資格規則及權限需與T-01/C-06一致。 | V2-C06, PDF-GAP-04, PDF-GAP-12 |
| M-02 日期折叠列表选择 Slot | 已确认 | 对话补充 | 待核／待核 | 無 | 配額可用人數的展示維度（總/調課）與跨課資格規則。 | V2-C06, PDF-GAP-04, PDF-GAP-12 |
| M-03 Student-level Pending Confirmation | 已确认 | 对话补充 | 待核／待核 | 無 | Pending最長保留、回取消/歷史規則未細化；不能先自行釋放名額。 | V2-C06 |
| M-04 选 Slot 后两端时间表同步 | 已确认 | 对话补充 | 待核／待核 | 無 | §十/P-03：原位如何釋放、目標如何佔用、扣堂、跨課/延期/取消通知邊界；這部分不能僅由“同步”推導政策。 | V2-C06, PDF-GAP-04, PDF-GAP-12 |
| O-01 Teacher-initiated Order 直接开单 | 已确认 | PDF 第6页 | 待核／待核 | 無 | Product、Fee選擇／名額報價版本與All/Single細節。 | V2-C05, PDF-GAP-03, PDF-GAP-07, PDF-GAP-08 |
| O-02 Parent Confirm Order | 已确认 | PDF 第6页 | 待核／待核 | 無 | 未付款到期與後續修改是否重Confirm。 | — |
| O-03 主动订单FPS付款与凭证上传 | 已确认 | 对话补充 | 待核／待核 | 無 | Slip格式、安全與提醒沿F-10。 | V2-C12 |
| O-04 主动订单确认收款后课程同步 | 已确认 | 对话补充 | 待核／待核 | 無 | 先Paid後Convert、退款/撤銷與Teacher權限。 | — |
| O-05 All Lessons / Single Lesson 选项 | 已确认 | PDF 第6页 | 部分完成／待核 | V2-E-ROSTER-RETURN,V3-E-ENROL-RESPONSIVE | 日期界面、資格／capacity final check、單堂多堂收費。 | — |
| O-06 Parent Order Response（三种选择） | 已确认 | 对话补充 | 待核／待核 | 無 | Request Changes的To-do為建議；再Send／再Confirm流程見O-07。 | — |
| O-07 Request Changes 重新出单与未付款规则 | 待细化 | 对话补充 | 待核／待核 | 無 | 待細化：再Send、再Confirm、催繳/到期/撤銷。 | — |
| P-01 Send Message to Parent | 已确认 | PDF 第3页 | 待核／待核 | 無 | 正文§十/P-08推送失敗處理；不宣稱WhatsApp後端自動送達。 | V2-C10, V2-C11 |
| P-02 Preset Message to Parents | 已确认 | 对话补充 | 待核／待核 | 無 | 模板字段、安全替換規則、普通老師可維護哪種模板範圍。 | V2-C11 |
| P-03 Notification Center 分类 | 已确认 | 对话补充 | 待核／待核 | 無 | 已讀/歷史保留/本機模擬推送及實際外部送達方式。 | V2-C11 |
| P-04 App 内家长回复机制 | 待讨论 | 对话补充 | 待核／待核 | 無 | 雙向回復、會話範圍及送達失敗流程。 | V2-C11 |
| R-01 Admin/普通老师权限 | 已确认 | PDF 第2页 | 待核／待核 | 無 | §十/P-01：動作與資料範圍詳細配置；不能以此未定為理由放寬已確認的讀取邊界。 | — |
| R-02 普通老师编辑权限细则 | 待讨论 | 对话补充 | 待核／待核 | 無 | 哪些動作、範圍、是否審批；本列不可先寫最終政策。 | — |
| R-03 Admin 管理正式 Overall Available Slots | 已确认 | 对话补充 | 待核／待核 | 無 | 配額與資格具體細節見 T-01；排課與可預約 Slot 的關係須建模，不能直接視為同物件。 | V2-C01 |
| R-04 授权普通老师编辑 Overall Slots | 已确认 | 对话补充 | 待核／待核 | 無 | §十/P-14：欄位、授課範圍及審批；公開設定授權方向已確認。 | V2-C01 |
| R-05 Personal Available Time Slot 独立层 | 待讨论 | 对话补充 | 待核／待核 | 無 | 是否需要、獨立資料層、轉正／同步機制。 | — |
| S-01 统一 App 登录与角色路由 | 已确认 | PDF 第5页 | 部分完成／待核 | V5-E-AUTH-OWNERSHIP,V5-E-ACCOUNT-MENU-TESTS | Native iOS只預留；role動作＋資料範圍細則需落定。 | — |
| S-02 Student Profile 与 Course History | 已确认 | PDF 第5页 | 待核／待核 | 無 | 欠資料顯示與剩餘堂數/Attendance扣堂政策。 | V2-C07, PDF-GAP-05, PDF-GAP-11, PDF-GAP-13 |
| S-03 Payment History / Receipt | 已确认 | PDF 第5页 | 待核／待核 | 無 | Save文件與系統歷史保存的定義、版本保留。 | V2-C03, PDF-GAP-09 |
| S-04 Course / Competition / Workshop 信息 | 已确认 | PDF 第5页 | 待核／待核 | 無 | 資訊字段、頻道與發佈狀態。 | — |
| S-05 课程活动发布与多端同步 | 已确认 | 对话补充 | 待核／待核 | 無 | 狀態名稱、雙頻道開關、撤回及授權。 | — |
| S-06 学生课表内调课/病假申请 | 已确认 | 对话补充 | 部分完成／待核 | V2-E-STUDENT-LESSONS,V4-E-STUDENT-WINDOW,V5-E-STUDENT-REQUEST-GUI,V8-E-STUDENT-COLD-WINDOW | P-20/S-09：截止、審批及扣堂。 | PDF-GAP-04, PDF-GAP-12 |
| S-07 常规课程续报提醒阈值 | 已确认 | 对话补充 | 待核／待核 | 無 | 全局/每課/每生、重復閾值通知及課堂扣堂政策。 | V2-C04, PDF-GAP-02 |
| S-08 发布状态与频道开关细则 | 待细化 | 对话补充 | 待核／待核 | 無 | 待細化：Draft/Pending/Published是否採用、獨立開關。 | — |
| S-09 Sick Leave/Rescheduling 具体政策 | 待讨论 | 对话补充 | 待核／待核 | 無 | 待討論：截止、審批權限、病假/Attendance扣堂及補堂資格。 | PDF-GAP-04, PDF-GAP-12 |
| ST-01 GPS 100m 外勤分类 | 已确认 | PDF 第7页 | 待核／待核 | 無 | 定位失敗/誤差、室內、多地點；本機模擬不證明iOS實際定位。 | V2-C10, PDF-GAP-01 |
| ST-02 Clock 自动状态标签及即时回显 | 待细化 | 对话补充 | 待核／待核 | 無 | 待細化：過早、無課、連續/重疊、跨天及手改邊界；15/30不是默認。 | — |
| ST-03 打卡不受排课时间限制 | 已确认 | 对话补充 | 待核／待核 | 無 | 無課標籤判定與定位拒絕處理。 | — |
| ST-04 独立打卡记录及标签异常 | 已确认 | 对话补充 | 待核／待核 | 無 | 事件編輯權限、標籤異常及審計。 | — |
| ST-05 Monthly Salary Record & Payslip | 已确认 | PDF 第7页 | 待核／待核 | 無 | 費率/薪資類型生效、月薪假期待遇、鎖定/發放、捨入與法務確認。 | V2-C10, PDF-GAP-01 |
| ST-06 Staff Leave & Public Holiday | 待讨论 | PDF 第7页 | 部分完成／待核 | V2-E-LEAVE-UI,V3-E-LEAVE-GUI | 保留原待討論狀態；Public Holiday/AL/補假餘額、薪資和證明附件未定。 | V2-C09 |
| ST-07 Off-site Clock Photo / Reason Settings | 已确认 | 对话补充 | 待核／待核 | 無 | 默認開關、相機/相冊/權限、格式/尺寸/保存期。 | V2-C12 |
| ST-08 Monthly Payroll Scheduled vs Actual | 已确认 | 对话补充 | 待核／待核 | 無 | 異常事件組合、取消班次如何計薪、時區/捨入。 | — |
| ST-09 Late Deduction By Minutes | 已确认 | 对话补充 | 待核／待核 | 無 | 法律／合同適用由用戶另行確認；不把示例2元當合法默認。 | — |
| ST-10 Admin Approved Overtime | 已确认 | 对话补充 | 待核／待核 | 無 | OT單價、分鐘/小時換算、審批權限與修改審計。 | — |
| ST-11 Monthly Salary History / PDF Payslip | 已确认 | PDF 第7页 | 待核／待核 | 無 | 已批准版本、發放/鎖定、修訂及PDF字段。 | V2-C10, PDF-GAP-01 |
| ST-12 Missing Punch Payroll Validation | 待细化 | 对话补充 | 待核／待核 | 無 | 待細化：事件配對審核、無課/跨天、Payroll引用。 | — |
| ST-13 Teacher Profile Salary Type（月薪/时薪） | 已确认 | 对话补充 | 待核／待核 | 無 | 類型/費率變更生效日、歷史快照與月中變動。 | — |
| ST-14 Sick Leave Application & Admin Approval | 已确认 | 对话补充 | 待核／待核 | 無 | 理由/證明、最小單位、審批通知、撤回修改。 | V2-C09 |
| ST-15 Sick Leave Timetable Overlay & Leave History | 已确认 | 对话补充 | 待核／待核 | 無 | 導出/打印、撤回和更改；代班明示按ST21/22。 | V2-C09 |
| ST-16 Sick Leave Payroll & Substitute Details | 待细化 | 对话补充 | 待核／待核 | 無 | 待細化：有薪/無薪、工資、文件、導出；代班衝突/通知見ST23。 | V2-C09 |
| ST-17 Unified Staff Leave Types | 已确认 | 对话补充 | 部分完成／待核 | V2-E-LEAVE-UI,V3-E-LEAVE-GUI | 公眾假期規則、單位、餘額與工資；具體狀態字段可設計但不能代替確認。 | V2-C09 |
| ST-18 Teacher Leave Request → Admin Approval | 已确认 | 对话补充 | 待核／待核 | 無 | 撤回/改期、證明、通知、多人審批衝突。 | V2-C09 |
| ST-19 Admin Direct Leave Entry | 已确认 | 对话补充 | 待核／待核 | 無 | 更正/撤銷、範圍及審批狀態命名。 | V2-C09 |
| ST-20 AL Remain & Compensation Leave Ledger | 待细化 | PDF 第7页 | 部分完成／待核 | V2-E-LEAVE-UI,V3-E-LEAVE-GUI | 待細化：初值、累計、公眾假期資格、單位、回補、待遇。 | V2-C09 |
| ST-21 Leave Conflict Warning During Trial/Class Assignment | 已确认 | 对话补充 | 待核／待核 | 無 | B同時間有課/假期是攔截、提醒還是強制安排；多選老師如何處理。 | V2-C09 |
| ST-22 Approved Leave Triggers Substitute To-do | 已确认 | 对话补充 | 待核／待核 | 無 | 批量代班、任務關閉規則、家長通知；不能用series全改代替單堂。 | V2-C09 |
| ST-23 Substitute Teacher Availability Conflict Handling | 待细化 | 对话补充 | 待核／待核 | 無 | 待細化：禁止/提醒/override、跨日、多課選擇、通知與費率/OT關係。 | V2-C09 |
| T-01 Teacher Available Slot | 已确认 | PDF 第1页 | 待核／待核 | 無 | 兩類可否同時開、總數與分配額如何相互約束、老師範圍；有方向而非任意自己定公式。 | PDF-GAP-12 |
| T-02 试课申请即占名额 | 已确认 | 对话补充 | 待核／待核 | 無 | 取消／改期配額如何回寫另待定；不能借 Reject 規則推導全部逆向操作。 | — |
| T-03 试课老师 WhatsApp 确认 | 已确认 | PDF 第1页 | 待核／待核 | 無 | 表格電話校驗、聯絡後試課確認狀態及失敗回饋（§十/P-05）。 | — |
| T-04 试课结束自动提醒 | 已确认 | 对话补充 | 待核／待核 | 無 | 時區、觸發時機及歷史呈現可設計；不能只做一次toast。 | — |
| T-05 试课结果与跟进状态 | 已确认 | 对话补充 | 待核／待核 | 無 | 是否另有聯絡確認狀態、改期通知及配額回收規則。 | — |
| T-06 Applicant List / Student List | 已确认 | 对话补充 | 部分完成／待核 | V6-E-PEOPLE-CONTEXT,V6-E-PEOPLE-IAB-LIMITED | 完整姓名／家長／去重識別規則與重復轉換衝突回饋。 | — |
| T-07 Edit Details 后转正式学生 | 已确认 | 对话补充 | 部分完成／待核 | V6-E-PEOPLE-CONTEXT | Convert必填、是否綁定班／課包；Direct Enrollment的Confirm Request後可Convert已確認，付款先後綁定細節仍待定。 | — |
| TM-01 Timetable Date / Class Text Remark | 已确认 | 对话补充 | 待核／待核 | 無 | 日期/班次備注的作者、編輯範圍與可見權限；不同於A-02學生備注。 | — |
| TM-02 Timetable Remark 与正式考勤状态分离 | 已确认 | 对话补充 | 待核／待核 | 無 | 正式留存/審計及備注可見性；不能自動識別文本觸發正式狀態。 | — |
| TM-03 Substitute Teacher Timetable & Slot Color Sync | 已确认 | 对话补充 | 待核／待核 | 無 | 普通老師能否代班及授權；假期審批流程由擴展清單定，不能把一般teacherIds修改等同代課完工。 | V2-C09 |
| W-01 公开网站 Homepage | 暂缓 | PDF 第1页 | 待核／待核 | 無 | 後續何時恢復公開Homepage設計；SEO是未來方向。 | V2-C08, PDF-GAP-01 |
| W-02 Course Details 与课包 | 已确认 | PDF 第1页 | 待核／待核 | 無 | 最新6課準確名稱/適齡/內容/課包及真實價格須以維護資料為準。 | V2-C07, V2-C08, PDF-GAP-01, PDF-GAP-05, PDF-GAP-07, PDF-GAP-13 |
| W-03 Trial Application Form | 已确认 | PDF 第1页 | 待核／待核 | 無 | 必填/選填/校驗/家長與學生身份資料對應，見§十/P-05；不能照示例全部設required。 | V2-C08, PDF-GAP-01 |
| W-04 Course Details 公开时段自动同步 | 已确认 | 对话补充 | 待核／待核 | 無 | 合資格Slot關係及公開字段最小集；不得洩漏內部學生／備注。 | V2-C01, V2-C02, PDF-GAP-09, PDF-GAP-13 |
| W-05 Public Visibility 与 Manual Override | 已确认 | 对话补充 | 待核／待核 | 無 | 公開權限授予具體範圍、UI式樣；字段不可改的原則已確認。 | V2-C01, PDF-GAP-09 |
| W-06 Public Visibility 仅控制显示 | 已确认 | 对话补充 | 待核／待核 | 無 | 公開緩存更新／匿名數據邊界的技術方案。 | V2-C01, PDF-GAP-09 |
| W-07 Show Fully Booked Trial Slots | 已确认 | 对话补充 | 待核／待核 | 無 | 此Full指TrialQuota，不能用正式班額/出席數取代；公開強制顯示不等於容許超額。 | V2-C02, PDF-GAP-09 |
| W-08 Public Timetable Display Range | 已确认 | 对话补充 | 待核／待核 | 無 | 最短天數、30天網頁/手機排版。 | V2-C02, PDF-GAP-09 |
| X-01 恶劣天气停课与调课 | 待讨论 | 对话补充 | 待核／待核 | 無 | 發起權、全班與個人、通知先後、扣堂/資格與批量補課均未定。 | — |
| X-02 超额及取消名额规则 | 待讨论 | 对话补充 | 待核／待核 | 無 | 是否/怎樣允許超額、上限、警告、審批、退課/退款釋放原/目標位規則。 | — |

## 7. PDF-GAP-01～13

| ID／原稿差異 | 頁碼／Notion映射 | 現行所需結果 | 未定邊界 | UI／功能／fresh |
|---|---|---|---|---|
| PDF-GAP-01 原 PDF 九頁逐項來源對照 | 1–9；W-01, W-02, W-03, ST-01, ST-05, ST-11 | 原稿九頁/Notion延伸/最新決定各有來源及對照。 | 模糊字/截圖候選/原稿矛盾不從OCR或摘要硬定。 | 待核／待核／無 |
| PDF-GAP-02 老師續報跟進＋家長提醒分開 | 5,6；S-07, D-01, D-03 | 老師門檻跟進/聯絡意向/下期單，家長提醒並行。 | p.5有剩下1堂、p.6有尾2…兩處門檻線索，不硬編1或2；保留已確認可設定Remaining方向，精確預設/適用範圍、接收範圍/完成/去重待核。不自動續費或真發WhatsApp。 | 待核／待核／無 |
| PDF-GAP-03 Referral／個別學生／產品／訂單折扣區分與優惠留存 | 5,9；F-02, F-08, F-09, O-01 | 推薦來源及下次使用；個別/產品/訂單/Coupon不混同。 | 獎勵/有效期/疊加/退款/分次抵扣未定，不造餘額。 | 待核／待核／無 |
| PDF-GAP-04 同課題／教學週期的調課資格 | 2；C-06, M-01, M-02, M-04, S-06, S-09 | 原稿同課題調課方向已定；合資格目標須保留課題關係，受限類別可聯絡老師安排。 | 待決是課題識別、課題與教學週期/日期窗的映射及跨課題/週期特批；截止/扣堂/原目標名額依相關確認政策。不把同課題方向整項待決，不擅定同曆週或任意日期皆可。 | 待核／待核／無 |
| PDF-GAP-05 組合課包與課程資料矛盾 | 1,4；W-02, C-07, S-02 | 組合內容/分段時長/課次可維護，保留課程資料矛盾。 | 40/45分鐘及組合排扣補未定；不重建成十課示例。 | 待核／待核／無 |
| PDF-GAP-06 Sales 月度、Accounting 月／季／年、Product／Course Payment Summary | 8； | 月Sales、月季年Accounting、Product明細摘要/CoursePaymentSummary可追溯。 | cash/earned、收款開單日/退款折扣/時區邊界待定；Goal已有Reports，不當程式全缺。 | 部分完成／待核／V11-E-ACCOUNTING-PERIOD,V13-E-ACCOUNTING-ENTRY,V13-E-REPORTS-CATALOG |
| PDF-GAP-07 課程與 Fees 各自新增／修改、時長／月數／價格生效 | 9；W-02, O-01 | 課程與Fee各自新增修改，時長/月數/期限/價格生效與歷史。 | 240分鐘/1month是截圖例，ScheduleNewPricing/期限/多課關聯不猜完整算法。 | 部分完成／待核／V3-E-FEES-RETURN |
| PDF-GAP-08 Product 維護及 Different Discount | 9；O-01, F-02, F-08, F-09 | Product新增/修改/查詢及DifferentDiscount，不由開單可選代替。 | Tax/Cost/深庫存/網店/圖片只是候選，未確認不造政策。 | 部分完成／待核／V3-E-PRODUCT-RETURN,V5-E-PRODUCT-LIST-GUI |
| PDF-GAP-09 手動／自動公開課表、手動／自動收據的決策來源 | 4,5；W-04, W-05, W-06, W-07, W-08, F-05, F-12, F-13, S-03 | 人工公開維護＋自動帶入，自動單據保存/測試寄件＋手動補寄。 | 公開獨立改時間、單據/寄件trigger待定，不回退只Show/Hide或只手動Send。 | 待核／待核／無 |
| PDF-GAP-10 來源完整性及版本狀態 | 1–9； | 原Source/Status與執行/證據分開；111不是固定分母，重複項交叉引用。 | 正文P索引與register/P不同；歷史測試不是現況。 | 待核／待核／無 |
| PDF-GAP-11 分鐘型課包餘額、堂數及期間 | 3；C-07, S-02, F-07, A-03 | 分鐘/次數餘額及期間在名冊/訂單/學生端一致，不暗換算。 | 720分鐘不自動折固定堂；出席調補扣減/回補待定。 | 待核／待核／無 |
| PDF-GAP-12 定期開補堂 Slot 並通知待補家庭 | 5；T-01, M-01, M-02, M-04, S-06, S-09, D-03 | 定期開補堂Slot、找正確待補家庭、通知/選擇/確認/結案。 | 每月線索保留；週期/名單/資格/有效期/扣額待定，不向全體開放空格。 | 待核／待核／無 |
| PDF-GAP-13 中英文姓名與公開課表色彩語意 | 1,4；S-02, W-02, W-04, C-03 | 中英文姓名保留；公開課型色與內部老師色分開且有文字識別。 | 雙姓名必填/公開精確色票不硬編。 | 待核／待核／無 |

## 8. 更新與完成規則

- 原ID／Source／Status／Key Rules／URL、來源索引及歷史引用不可覆寫；JSON evidence保留原紀錄並追加，來源manifest更新前保存被替換版本。
- 本輪只更新限定UI欄、證據及下一步；原v2.5協調文字保持。function／role_scope／persistence_recovery／performance逐項保持原待核／未量度，不把UI回歸當完整授權或持久性驗收。
- 完整Goal依PDF九頁及13差異、相容Notion、v2.5協調及最新要求逐項完成，真GUI、功能、權限、恢復及效能各有證據；主要功能或重要政策未定不能結案。
- 本次只修改此MD、JSON及checkpoint，不改程式／Goal／AGENTS／原PDF／Notion snapshot／DB；無Commit／push。日誌與畫面核對不冒稱重新跑應用測試或重新操作來源。

## 9. 有限證據索引（保留歷史，最新以V13／V14摘要為準）

| ID | 範圍 | 證據與限制 | 日誌／圖片 |
|---|---|---|---|
| V6-E-FULL-TESTBUILD | People整合後中間版完整程式測試及build（早於Trial records標籤校正） | npm test 825/825、build成功；早於Trial records一行標籤校正，最新整合待重跑，不能稱最新程式全測通過。main780.80kB/PDF495.58kB，chunk警告仍在，效能未完成。沒有以測試總數代替GUI/業務/完整Goal。 | /tmp/beamal-v6-final-test.log<br>/tmp/beamal-v6-final-build.log |
| V6-E-PEOPLE-CONTEXT | Admin指定人物四入口精確ID、禁fixture、未知帳戶、未接提交停用與同步失效 | UI76/76、host27/27，獨立UI4/4、host5/5；404/403、換身份、Applicant→Student閉窗，metadata更新及noop保焦點/scroll。People真Chrome尚待，不代表正式Trial/Family/激活/Convert功能通過。 | /tmp/beamal-v6-people-independent-target.log<br>/tmp/beamal-v6-people-independent-ui-boundaries.log<br>/tmp/beamal-v6-people-independent-host-target.log<br>/tmp/beamal-v6-people-independent-host-boundaries.log |
| V5-E-PRODUCT-LIST-GUI | Products長清單排序/分頁/篩選及詳情編輯取消返回 | 主Agent真Chrome：11項、價升序、10筆/頁及page2，Cancel Edit保原名/168價格及同頁篩選；390中文、768英文、desktop中文。7筆臨時UI產品重載後清空回原4，沒有DB寫入；不宣稱390英文或產品共用保存通過。 | /tmp/beamal-v5-products-detail-390-zh.png<br>/tmp/beamal-v5-products-page2-desktop-zh.png |
| V5-E-STUDENT-REQUEST-GUI | Chloe申請edit→Review→Back與Sick→Reschedule保草稿及Escape返回 | 原先Next後日期/原因變空已真Chrome重現並修正；桌面及390英文保2026-10-23與reason，提交/附件disabled，Escape返opener。當時target42，現825含新回歸；申請保存/老師待辦/附件未接。 | /tmp/beamal-v5-student-request-review-390-en.png<br>/tmp/beamal-v5-student-request-review-desktop-en.png |
| V5-E-AUTH-OWNERSHIP | 慢登入導覽、新舊job所有權及public link跟隨權威身份 | 獨立10+2通過；保FAQ草稿/焦點/scroll，過期身份雙向更新public link，舊401不清新身份。真Chrome老師登入/Logout正常的有限回報，不能證明舊native input問題根因已解。 | /tmp/beamal-public-login-final-independent-target.log<br>/tmp/beamal-public-login-independent-boundaries.log |
| V5-E-ACCOUNT-MENU-TESTS | Account menu正式與獨立程式回歸 | 正式16、獨立4通過。真Chrome老師menu曾可開，但目前teacher-home連一般按鈕亦偶爾無反應，工具/產品原因仍排查；暫不標menu GUI通過。 | /tmp/beamal-account-menu-final-target.log<br>/tmp/beamal-account-menu-independent-boundaries.log |
| V5-E-SCHOOL-STUDENTS-ACCOUNTING | 來源Students/Accounting空帳戶的建立學生與All Dates彈窗 | 來源兩頁0records，只查看Create Student及All Dates popup；沒有保存、付款、期間結果或來源全功能實驗。 | /tmp/beamal-v5-schooltracs-create-student.png<br>/tmp/beamal-v5-schooltracs-accounting-date-range.png |
| V6-E-SOURCE-V24 | Goal/比較檔來源版本及原稿文字校正 | 主Agent及獨立Agent重看原稿九頁，校正私人班非手作、FPS only。同課題方向已定，課題/週期/日期窗及例外待定；本文件者核對現實Goal/comparison SHA與行數，未冒稱自己重演所有線上來源。 | docs/schooltracs-rebuild/v2-ui-navigation-checkpoint.md |
| V6-E-PEOPLE-IAB-LIMITED | 本機Admin指定何凱晴的Family/Trial入口及Escape返回 | 同一既有IAB分頁可操作：Students→何凱晴→Family只顯同人、未知提示及disabled Add；Escape回同人及Family入口焦點。Trial亦顯同人記錄，沒有借Chloe fixture。這不證明Chrome無反應根因已解，也未驗activation/完整響應式/其他角色或正式保存。介面標籤另校正為試課記錄/Trial records；825全測及build早於此一行改動，最新整合待重跑。 | docs/schooltracs-rebuild/v2-ui-navigation-checkpoint.md |
| V11-E-FULL-TESTBUILD | 凍結程式最後整合及失敗歷史 | V11最後完整npm test847/847、build exit0，main795.25kB/PDF495.58kB，chunk警告仍在，效能未驗收。V8 baseline828/828；V10完整845/847有2項仍匹配Showing…records的舊單複數regex失敗，調整語法匹配後V11綠；不隱去失敗，不以總測試數代替全UI/功能/對帳。 | /tmp/beamal-v11-final-test.log<br>/tmp/beamal-v11-final-build.log<br>/tmp/beamal-v8-final-test.log<br>/tmp/beamal-v8-final-build.log<br>/tmp/beamal-v10-final-test.log<br>/tmp/beamal-v10-final-build.log |
| V8-E-STUDENT-COLD-WINDOW | 共享學生恢復登入與My classes/requests日期窗口、延遲回覆及草稿返回 | 正式2個窗口race先RED後GREEN，獨立9/9；另有cold首次載入正式RED→GREEN及target32。主Agent真IAB 127新開學生分頁My classes7堂含11/7，My requests當月6→My classes7；這是載入日期窗口，不是全部歷史。實際768/1280 Review→Back保原date/reason、Submit disabled、Cancel回exact opener，768留白16px/1280表單760px置中；無DB寫入，申請保存/附件/老師待辦未接。 | /tmp/beamal-student-cold-window-formal-red.log<br>/tmp/beamal-student-cold-window-formal-green.log<br>/tmp/beamal-student-window-race-formal-red.log<br>/tmp/beamal-student-window-race-formal-green.log<br>/tmp/beamal-student-window-race-independent-review.log<br>/tmp/beamal-student-window-race-targeted.log<br>/tmp/beamal-v8-student-review-768-en.png |
| V11-E-ACCOUNTING-PERIOD | 會計月/季/年/custom日期、精確記錄、未知值及篩選返回 | host40+operations module37合77/77（前40亦含其他host流程），會計獨立11/11。程式覆蓋期間邊界、無效日期保舊合法結果、未知日期/金額不造零、missing ID不借首筆及產品/會計filters隔離。真IAB Admin custom10/12–10/13 Query Isla，Enter先無效（Apply為typebutton）→改原生submit後同流程通過，invoice1/payment1/credit0；To10/11報錯保輸入及舊合法結果，修正Apply成功；2025全年無結果→2026的1/1–12/31恢復3。會計為operations示例記錄，不是shared帳款；篩選不是正式財務口徑、保存或報表對帳完成。 | /tmp/beamal-v11-accounting-targeted.log<br>/tmp/beamal-v11-independent-accounting.log<br>/tmp/beamal-v10-accounting-filter-1280-en.png<br>/tmp/beamal-v11-accounting-table-768-zh.png |
| V11-E-ACCOUNTING-DOCUMENT-RETURN | 會計精確Invoice→PDF選項→Save/Email表單/Preview逐層返回及響應式 | 獨立review曾重現顯式Back未恢復及order-document Escape兩RED，最後11/11含兩者GREEN。真IAB 390 Email left16/right374/body scroll141；填示例email/subject/body/attachment→Preview→Back to edit保subject/body、scroll141及Preview email焦點；Escape→PDF options→exact INV2→清單，focus INV2且custom日期/Isla保留。Save改Isla-October-receipt.pdf→settings Preview→Back保filename，Cancel回options。768表格自身scrollWidth811/client734，doc768、ArrowRight觀察scrollLeft6；390 doc390。主Agent觀察console error/warn空。未生成PDF、未寄Email、無DB業務寫入；不是收據保存/附件實際投遞通過。 | /tmp/beamal-v11-accounting-targeted.log<br>/tmp/beamal-v11-independent-accounting.log<br>/tmp/beamal-v11-accounting-table-768-zh.png<br>/tmp/beamal-v10-accounting-email-back-390-en.png |
| V11-E-SCHOOL-ACCOUNTING | SchoolTracs空帳戶的Invoices/Receipts及日期篩選觀察 | 主Agent本輪真Chrome：Invoices/Receipts都空資料；Invoices Awaiting及dateType All dates/Invoice Date/Billing Month/Due Date、From/To/Apply，套10/1–10/31顯日期；Receipts欄Number/CreatedDate/Student/Staff/PaidTotal/Method/Remark。因0資料不能稱detail/計算/保存全驗；未改來源業務資料，已還原原Timetable URL。 | docs/schooltracs-rebuild/v2-ui-navigation-checkpoint.md |
| V11-E-SOURCE-V25 | Goal v2.5來源版本及兩處續報門檻 | 本輪來源複核回報111線上內容/狀態無實質差異，92/9/9/1保留；p.5剩下1堂與p.6尾2…兩處線索均記錄，精確預設/適用範圍待核，不硬編1/2。文件更新者核對現實Goal438行/comparison187行SHA；Launch161行另核對。保留原稿優先、Notion相容延伸、私人班/FPS only及兩種Convert/Paid順序；不是功能完成。本次不改Goal/原snapshot/線上Notion。 | docs/schooltracs-rebuild/v2-ui-navigation-checkpoint.md |
| V14-E-FULL-TESTBUILD | V14最後整合與V13同產品程式build，保留失敗脈絡 | V14完整869/869，exit0、fail/cancel/skip/todo全0，21.54s；V13 build exit0，main804.97kB/PDF495.58kB，chunkwarning未解，非效能驗收。V13全測868/869因flows VM未注入reportsPageMarkup，修正測試import/injection後4sidebar targeted及V14綠；這是test harness問題，不是瀏覽器runtime。初始entry test-key syntax錯亦保留，不能當產品RED。產品code與V13build相同，後續只修測試VM故未重跑build。 | /tmp/beamal-v14-final-test.log<br>/tmp/beamal-v13-final-build.log<br>/tmp/beamal-v13-final-test.log<br>/tmp/beamal-v13-reports-host-wiring-green.log<br>/tmp/beamal-v13-entry-host-test-syntax.log |
| V13-E-ACCOUNTING-ENTRY | Accounting新增/精確Invoice編輯/Payment/Credit的動態items、Review及返回 | 正式module42+host44合86/86，獨立新8+3及舊11通過；4個正式host先0/4 RED再4 GREEN。輸入只更新局部summary不重mount，新增row/刪中row焦點、精確Invoice、綁定Payment/Credit及防偽submit保留原data。真IAB1280中文空student、2行加3刪中保line1/3，摘要273，Review→Back保notes/focus/scroll239；390英文INV2價285×4−10=1130，due10/10錯誤保draft→10/19+Enter Review，Back保unitPrice焦點/scroll171.5，Cancel仍原1120；手機Review價額直排後重驗全可見。bound Pay/Credit固定INV2/Isla，Pay80 Review/Back/Cancel回INV2，列表Pay空白選INV2更新Isla。V14最新code桌面另核對兩行278−5=273，console error/warn空；最後提交disabled、偽submit不改data；operations示例非共享帳務，未付款/記帳/保存。 | /tmp/beamal-accounting-entry-independent-v1.log<br>/tmp/beamal-accounting-entry-independent-host-v1.log<br>/tmp/beamal-accounting-independent-entry-host-module-regression.log<br>/tmp/beamal-v13-entry-host-red.log<br>/tmp/beamal-v13-entry-host-green.log<br>/tmp/beamal-v11-independent-accounting.log<br>/tmp/beamal-v13-invoice-review-1280-zh.png<br>/tmp/beamal-v13-invoice-review-390-en-final.png<br>/tmp/beamal-v14-invoice-review-1280-zh-final.png |
| V13-E-REPORTS-CATALOG | 20項報告目錄及受控子頁renderer；正式入口仍停用 | 保留原19項完整名稱/description，另加Course Payment Summary為第20項；正式13、獨立10通過。所有20項正式入口disabled，query子頁只有受控renderer；Clock columns是獨立events，不偷配In/Out。真IAB390英文/768英文/1280中文確認目錄doc無溢出、20disabled、側欄收起、console空；768英文doc768、四groups一列左右20/748。未驗真入口、查詢、數字/對帳、匯出或子頁真GUI；不能將受控renderer標為已從入口通過，更非Reports全頁完成。 | /tmp/beamal-reports-independent-formal-target.log<br>/tmp/beamal-reports-independent-final.log<br>/tmp/beamal-v13-reports-390-en.png<br>/tmp/beamal-v13-reports-1280-zh.png |
| V13-E-SCHOOL-SALES | SchoolTracs Sales選課層的有限參考 | 主Agent真Chrome：Sales Q選課畫面見All/Single、Search student及Save/Pay停用。來源沒有實際學生，不能完整checkout或聲稱保存/付款結果已對照；無來源業務寫入，已回原Timetable。 | /tmp/beamal-v13-schooltracs-sales-selection.png |

## 10. 來源文件當前快照

SHA／行數只辨認版本，不代表系統或線上來源功能已驗。Launch v2.5的161行及SHA另記V11-E-SOURCE-V25，原manifest的12個來源列保持。

| 文件 | 行數 | SHA-256 |
|---|---|---|
| docs/schooltracs-rebuild/ULTIMATE-GOAL-PROMPT.md | 438 | f49d95336d9ef3a8d7727e66696c7aabdde9dee93b162f4e5ad9d9592381b2f9 |
| docs/schooltracs-rebuild/pdf-notion-comparison-20261015.md | 187 | d4a101a68d5914141661757793a5333c5bf07626ab9c1fa852a2bfd049f0333d |
| docs/schooltracs-rebuild/notion-requirements-source.md | 546 | c74c34bf4f00bab120c18ffb880094dd6dd522f0e137752e22439f679c35b743 |
| docs/schooltracs-rebuild/notion-requirements-register-source.json | 896 | 183c03fafa5bcd5f22fd08e1108b271947bcbef9c70107c255c421c2c304f19d |
| docs/schooltracs-rebuild/notion-coverage-core.md | 213 | a426ce478eeb88eefd0855a28fd669f4b04d7761a6bc8ce7907039c76830377c |
| docs/schooltracs-rebuild/notion-coverage-operations.md | 217 | 5500057a43735089badbb59ce6e31b015eae7722a3e515c42d282795b0f23999 |
| docs/schooltracs-rebuild/local-system-architecture.md | 301 | dac4289efa6922373abb78ecdb86e1f7de4bd21cf5d3a5d670b49c2be5fa8720 |
| docs/schooltracs-rebuild/STATUS.md | 179 | ca08f1b19a7d94c4343017e82135672114c8991a3131c6b565b31a65953812cf |
| docs/schooltracs-rebuild/DEFERRED.md | 101 | c3ea4e9e23de30cebc472e79e25576609ba9687bbb131d8812ca0f91ae0355aa |
| docs/schooltracs-rebuild/notion-acceptance-roadmap.md | 83 | f8b381501454da4f697a083c5e47178eca7520f241595c53721301fb251a8ac7 |
| docs/schooltracs-rebuild/UX-QUALITY.md | 114 | 6d55572c646c17d0826f896244e55e3717132a5cac98b3d02d4d8993e2e01b49 |
| docs/schooltracs-rebuild/relational-demo.md | 80 | f57505cc682fee8979b409f3ce37b1780eb399de50136aaf709cab51e7ca060c |

### 被替換來源快照（追加保留）

| 日期／原因 | 文件 | 行數 | SHA-256 |
|---|---|---|---|
| 2026-10-15 原稿優先v2細則補受限課型、報告階段例外及來源複核；保留初次快照 | docs/schooltracs-rebuild/ULTIMATE-GOAL-PROMPT.md | 420 | 1a89974bf1c14e7fd16531998503a22d0f0d5205324619a57f72148803dc5002 |
| 2026-10-15 原稿優先v2細則補受限課型、報告階段例外及來源複核；保留初次快照 | docs/schooltracs-rebuild/pdf-notion-comparison-20261015.md | 179 | 1ffcd8507773ac2e30b781c928d3ef536502c6cad1c1ffa1f0615ef839e36980 |
| 2026-10-15 承接使用者最新原稿優先 Goal v2.2，保留舊來源版本；不代表系統完成 | docs/schooltracs-rebuild/ULTIMATE-GOAL-PROMPT.md | 428 | a93b79b587cfe5602e7a0e144e0f1edb46ad020b1cc9949ce033e16ab27bf59d |
| 2026-10-15 承接使用者最新原稿優先 Goal v2.2，保留舊來源版本；不代表系統完成 | docs/schooltracs-rebuild/pdf-notion-comparison-20261015.md | 181 | 0e35406be955e5f9c06bd5a5a7240912fb20be1adfd1b2efd4f9299d2d0dde0d |
| 2026-10-15 同步 Goal v2.4／原稿放大校正及 V5/V6 有限證據前保留被替換的實際來源快照；不改原 Notion/PDF snapshot | docs/schooltracs-rebuild/ULTIMATE-GOAL-PROMPT.md | 432 | ef4f69b289a179935e2d0530db896a9d7855e17b3286363252dec2b6e9021707 |
| 2026-10-15 同步 Goal v2.4／原稿放大校正及 V5/V6 有限證據前保留被替換的實際來源快照；不改原 Notion/PDF snapshot | docs/schooltracs-rebuild/pdf-notion-comparison-20261015.md | 181 | ab64492faae55f7cc6a20270a68107758ef5939dcfcb7f4f8c5fbf3f66d84cc0 |
| 2026-10-15 採用Goal v2.5及續報兩處門檻線索前，追加保存被替換的v2.4來源SHA/行數；原Notion/PDF snapshot不改 | docs/schooltracs-rebuild/ULTIMATE-GOAL-PROMPT.md | 439 | 644d489ee912a1532a018a4e6a6260cbf78d851dfaf6d43cb1c8b69c324d1a55 |
| 2026-10-15 採用Goal v2.5及續報兩處門檻線索前，追加保存被替換的v2.4來源SHA/行數；原Notion/PDF snapshot不改 | docs/schooltracs-rebuild/pdf-notion-comparison-20261015.md | 185 | daa12cb3c0c9557afd554fbc981efed124a9537a4407ffbb25947adeead62f0d |

## 11. v2.4／V5–V6進度摘要原文（歷史保留）

以下測試／待驗／下一步是更新前狀態，不能取代上方V11現況；原UI及切片狀態另保存在JSON execution_history，所有原fresh/historical引用不變。

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


## 11. 上一版進度摘要原文（v2.2；歷史保留）

以下僅代表更新前的狀態；775／製作中／待凍結不代表V6現況。完整原先UI及切片狀態另保存在JSON execution_history，所有舊fresh evidence及historical_refs原樣保留。

（2026-10-15；其餘舊段落按歷史閱讀）

- 現行來源是 Goal v2.2；原PDF九頁及Notion主文/111項剛完成來源複核，原稿優先及相容延伸維持。以下進度不是來源Status。
- 早段整合775/775及build通過；課程/名冊/報讀表單、Fees來源返回/新價子畫面、Products取消返回、Leo請假UI已有所列限定GUI。不能以此證明現在所有頁或新修正已通過。
- 本輪真Chrome Chloe：十月6堂及十一月7日課堂能循時間表/申請找到，My classes列7個啟用課節；390CSS側欄選頁後收起且整頁不橫溢。完整歷史及申請保存仍待完成。
- 學生申請自然文案/核對/未接提交保護、登入競態、Products排序分頁正整合；新完整tests/build、獨立review與最終GUI待凍結。
- 任務UI-V2-08～12已加JSON：產品、工作台、新價、學生申請、登入。新增登入UI區域，清單不再固定只有25區。詳見[最新檢查點](v2-ui-navigation-checkpoint.md)。



## 12. V8–V11摘要原文（歷史保留，非目前最新）

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

