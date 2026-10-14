# Notion 操作、家庭、付款及員工需求覆蓋盤點

盤點日期：2026-10-14。本檔只記錄需求、目前證據與下一步驗收，**不是已完成聲明**。本輪依使用者最新範圍：4 位老師、300 名 active 學生、6 個課程、3–18 歲；先在本機完成真實共用工作流程，中英文與手機網頁保留。部署、SEO、native iOS 不列本輪完成條件，但保留相同身份、交易、課次、通知與檔案接口，日後可接伺服器及 App。

## 來源與覆蓋範圍

- 主文完整快照：[notion-requirements-source.md](notion-requirements-source.md)（XIV–XVII 全文；相關 VII、II 與 EX09–EX25）。
- register 完整快照：[notion-requirements-register-source.json](notion-requirements-register-source.json)；111 筆中本檔逐項列 **63 筆**：F 13、FAM 11、O 7、S 9、ST 23。原 register 狀態為 **51 已確認／9 待細化／3 待討論**；保留來源狀態，不將來源矛盾偷偷改成新結論。
- 其餘 48 筆及主文 I–XIII／EX01–EX08 見 [core 覆蓋盤點](notion-coverage-core.md)。TM-01–TM-03 的逐 ID 表在 core；本檔仍列 §17.2.4／EX24 的內部 Remark 驗收及跨模組影響。
- EX 的人名、日期、HK$、時數都是虛構測試例，不是現有學生／真實付款或薪金。文內資料模型／狀態名稱「建議」與已確認業務效果分開；待討論事項不因有示例就變成已確認。

## 目前實作證據的邊界

讀碼時，共用 HTTP API 有 auth、Course／Fee、catalog、schedule／scoped occurrence、排課 teacher/room resources，以及教材／附件。資源與 ID 指派切片仍在整合，不能因 server tests 或 UI CRUD 通過就當 Staff、Teacher Login、Leave、Payroll 完成。

`sample/src.js` 的 `payments`／`incomePage`／`markPaid`／`finish`／`studentList` 是舊本機示範：booking 使用 demo 身份，付款推導學生名單，並非下面獨立的 Request／Payment／Convert／Family 流程。現有收入 Excel 不是 Salary Record；教材 PDF 閱讀／附件上載不是 Receipt 生成或 FPS Slip。`management-preview` 本身也明示不建立或修改帳戶。

讀取的 `sample/server/app.mjs` 沒有正式共用 Payment／Order／Family／Applicant／Enrollment／Coupon／Notification／Clock／Payroll／Leave 路由。因此下表除明列「部分」外，相關效果均有主要缺口；不以假資料、toast、單一頁面的按鈕或既有綠測試作完整證據。普通 teacher 目前全校 schedules 唯讀，也不符合最新「自身／獲授權課堂」要求；URL、API、檔案與篩選器都要按最新範圍重驗。

## 必須獨立的業務動作

| 動作 | 已確認效果 | 不能附帶發生 |
|---|---|---|
| Request to Pay／Teacher Send | 建立申請或老師訂單、通知授權對象 | 不 Paid、不正式入班、不自動 Convert |
| Confirm Request | 確認最終 Items／Amount，Awaiting Payment；Direct Enrollment 此時可另按手動 Convert | 不收款、不增加名單／課包／課表 |
| Parent Confirm Order | 記錄家長接受訂單並通知老師 | 不當 Confirm Request 或 Confirm Payment、不 Paid |
| FPS Slip 上傳／收到 WhatsApp 圖 | 交易有待老師核實的憑證 | 不證明銀行到賬、不自動 Paid 或排課 |
| Confirm Payment | 老師人工核實後 Paid；課程 Item 正式入班、同步座位／課包／雙端 Timetable／Payment History | 不自動 Convert；非課程 Item 不生成課堂；重試不重複記帳或佔位 |
| Convert to Student | 老師手動將 Applicant 轉正式 Student Profile，保留原記錄 | 不再收一筆款／再排一次課；不代表已啟用 Login |
| Activate／Reset | 經已定驗證機制建立或重置 Family Login | 老師不能看原密碼；首名學生激活付款前置條件尚未定 |

Confirm Payment→Convert 與 Convert→Confirm Payment 都要防重複；前一條的 Applicant／Student 綁定及家庭顯示仍待細化，不能未定就宣稱全部驗收。正式 paid receipt 以人工 Confirm Payment 為前提；付款前常駐 PDF Receipt 仍可按已定版式輸出 Draft／Payment Pending，但不能標 Paid。

## 來源矛盾及處理方式

| 來源落差 | 本輪忠實處理 |
|---|---|
| intro 說 PDF 6–9 未逐項 review；§16、§17 後文已多次明標 ✅；§17.2 標題仍「尚未逐項討論」 | 保留舊 intro，不用它把後文明確確認的 O／ST 主流程整批延後。每列使用具體後節與 register 原狀態。 |
| ST-06 register 待討論；§17.2.2–17.2.3、ST-14／17–19 已確認四種 Leave、老師申請／Admin 登記、History/Overlay | 審批／顯示屬主要已確認；Public Holiday、AL／補假餘額及待遇政策仍未定，分拆記錄。 |
| ST-16／§17.2.2／EX23 舊文字把代班操作待定；§17.2.5、ST-21–22、EX25 已確認雙向提醒及 Admin 選特定 Session 代班 | 主動衝突提醒、Affected Sessions、手選 B、雙端課表及教師主色同步已確認；B availability、批量及通知仍待細化。 |
| §17.1 舊尾句說另做薪資計算尚未定；§17.2.1、ST-05／08／13 及 EX20–21 已明確確認薪資類型與 Scheduled 基本計薪 | 不把 Payroll 全當可跳過；只將費率生效、OT單價、異常配對、捨入、假期待遇及法律／合同適用保留待決。 |
| FAM-05／§14.6：Paid後才給帳戶 vs Convert後可Activate | 仍待討論；不替使用者選一條。已有家庭加孩子不需新 Login／新密碼則已確認。 |
| 舊開發安排曾把 PDF／通知視為 minor；F-04–05／11–12、S-03 後文明確確認 | Receipt 模板、常駐按鈕、最新 PDF、正確附件與授權 History 是本輪主要要求。發信 adapter 可本機測試，但不得把無附件 mailto 或未實際送達標作完成。 |
| 正文 P-xx 是待討論索引；register P-xx 另有家長訊息條目 | 下表 P-16／21 等指「正文待討論索引」，不可與 core register P-01–04 混作同一需求。 |

## 逐 ID 覆蓋與驗收

「待細化」只限制未定細節，不抹掉同列已確認的主動作。涉及 FPS、Email、Notification、Payroll 全以虛構本機資料與明示 test mode 驗收；不向真人扣款、發信、發 WhatsApp 或支付薪金。

### F｜付款、Coupon、FPS 及 Receipt

| ID／register 原狀態 | 主文／來源節 | 業務效果 | 現況缺口 | 可驗收流程 | 待細化／不能自行推定 |
|---|---|---|---|---|---|
| [F-01](https://app.notion.com/p/3f5936c332a981c998d1c076c16e1dd4)：已確認 | §7.1、14.7；EX10；register 對話補充 | 家長申請既有／新課程、下期學費及多個 Items；建立待審付款要求，不是 Paid。 | 只有本機 demo booking；缺共用 Payment Request、家庭授權及多項交易。 | 家長選兩課＋一非課程商品提交；負責老師有同筆 To-do；Paid=false，名單／座位／課表不變。 | 各 Item 類型、金額／名額報價版本及先付款後 Convert 的資料綁定。 |
| [F-02](https://app.notion.com/p/3f5936c332a98120a655e2b8a16db2c8)：已確認 | §7.2、14.9；EX10；register 對話補充 | 老師可增刪改 Items／Discount／最終 Amount，最終確認值供付款。 | 缺共用項目版本、最終金額與修改紀錄；Fee 價格不能代替交易報價。 | 兩項100元→加／刪項並改50元；家長、老師及新下載單據均見50元；舊表單衝突不覆蓋。 | 老師改價與 Coupon 重算、重審及單據版本策略。 |
| [F-03](https://app.notion.com/p/3f5936c332a98138a46df89cafb2b0ff)：已確認 | §7.2、7.5、14.7；EX10；register 對話補充 | Confirm Request 只確認項目及金額，進入 Awaiting Payment；FPS 由老師人工核實。 | demo markPaid 沒有 Request／收款分離與核實人紀錄。 | Confirm Request→通知聯絡老師 FPS；不能 Paid、入班或 Convert；測試 Slip 亦不自動收款。 | 付款前文件名稱及先 Confirm Payment 後 Convert 綁定。 |
| [F-04](https://app.notion.com/p/3f5936c332a98121b04de1ff55388410)：已確認 | §7.3、14.11；EX12；register 對話補充 | 老師設定學校資料、既有 Logo、欄位、佈局、備註，預覽及保存 PDF 模板。 | 有教材 PDF 閱讀器，沒有 Receipt 模板編輯／生成器；不得自行替換 Beamal 圖片。 | 改學校文字／欄位→預覽→保存→重開；後續交易 PDF 使用同一模板與實際金額。 | 模板個人／全校權限、可編輯佈局及未付款版式。 |
| [F-05](https://app.notion.com/p/3f5936c332a9815d8a36d4dbc8a88dde)：已確認 | §7.3、14.11；EX12；register 對話補充 | Payment Request 詳情的 PDF Receipt 按鈕常駐，手動 Save 或 Send；未收款不能標 Paid。 | 沒有交易單據按鈕／文件生成；舊「PDF minor」安排不足以覆蓋最新主要需求。 | Pending／改價／Confirm Request／Paid 四階段按鈕均在；付款前輸出 Draft／Payment Pending，付款後才 Paid Receipt。 | 未付款文件正式名稱、編號與版本留存。 |
| [F-06](https://app.notion.com/p/3f5936c332a981f58952c2b5fb5da902)：已確認 | §7.4；register 對話補充 | 設定交費到期日、提醒頻率與開關；逾期不自動停權或停課。 | 缺可持久化到期日、提醒設定、通知排程與去重。 | 測試時鐘越過到期日→按已設頻率通知；關閉不再通知，帳戶及原課堂仍可用。 | 全局／個別規則、頻率上限、重複提醒及時區。 |
| [F-07](https://app.notion.com/p/3f5936c332a981a19c3ac8e66212aee2)：已確認 | §7.5、14.7；EX10；register 對話補充 | 只有 Confirm Payment 才使課程正式入班並更新名單、人數、雙端課表、購買／剩餘堂數；Convert 獨立。 | 缺共用 Enrollment／Payment History／座位交易；demo Paid 不等於此整套同步。 | Confirm Payment 一次→所有相關端同步；重按／重試不重複入帳、佔位、課包；非課程 Item 不排課。 | 先 Paid 後 Convert 的資料綁定／家長可見性；退款、撤銷、扣堂。 |
| [F-08](https://app.notion.com/p/3f5936c332a98102b4f3e9481674ebea)：已確認 | §14.9；EX09；register PDF 第5頁 | 保存 Coupon 模板並派發給指定學生或家庭，家長可查看。 | 沒有 Coupon 模板、已發券及受惠對象共用紀錄。 | 建立20元模板→派給A→A家庭看得到、B家庭及未授權老師看不到。 | 派到學生／家庭、有效期、使用次數與授權老師。 |
| [F-09](https://app.notion.com/p/3f5936c332a98105b080d148cc801acb)：已確認 | §14.9；EX09；register 對話補充 | Request to Pay 自動使用符合條件的券，老師看原價、折扣、受惠學生及最終金額。 | 缺交易券關聯與並發使用保護，尚不能把 Fee 價格當折扣後付款。 | 100−20=80雙端一致；同券同時兩單不能按未確認政策重複消耗；老師審核見完整明細。 | P-21：重用、疊加、超額、改價及退單恢復，未定條件不自行假定。 |
| [F-10](https://app.notion.com/p/3f5936c332a981858bc4d38604d399d6)：已確認 | §14.10；EX11；register PDF 第5頁 | FPS 憑證可經 WhatsApp 線下交老師或上傳並綁交易；仍須人工核實後 Confirm Payment。 | 教材附件功能不能代替交易 Slip 的家庭／老師授權與付款狀態。 | A家庭上傳到A的 Request→負責老師可看；B不能直URL讀；上傳前後都 Awaiting Payment，人工確認才 Paid。 | P-22：格式、大小、替換／去重、掃描及 Uploaded 子狀態；不實際對外發 WhatsApp。 |
| [F-11](https://app.notion.com/p/3f5936c332a98178ac0ac4170ef3766a)：已確認 | §14.11；EX12；register 對話補充 | 保存多份 Subject／Body 模板，使用時填入並可修改，To 取授權家長資料。 | 缺可保存的 Email 模板、收件人綁定及發送預覽。 | 選模板→正確家長 Email＋Subject＋Body；老師修改後預覽，不提前送出。 | 模板個人／全校範圍、權限與發件人。 |
| [F-12](https://app.notion.com/p/3f5936c332a981f5be8dc9c02b775272)：已確認 | §14.11；EX12；register 對話補充 | PDF Receipt→Save／Send by Email；郵件含正確交易 PDF、To、Subject、可編輯 Body。 | 沒有交易 PDF、附檔郵件及發送歷史；普通 mailto 草稿不能當完成。 | Save 下載最新內容；Send 預覽正確 PDF 附件及收件人→本機測試 outbox 保存整封 payload，清楚標「未對外」。 | 接正式服務／系統分享的方式、誰最終發送、失敗重試及版本保存。 |
| [F-13](https://app.notion.com/p/3f5936c332a98161b1c3ea901a446ccb)：待細化 | §14.11–14.12；EX12；P-23；register 對話補充 | 必須選能附加 PDF 的可靠發信／分享方案，不能只填 mailto 文字。 | 技術方案尚未落實；測試 outbox 可驗組裝但不證明對外送達。 | 用測試 adapter 驗附件 bytes／交易ID／收件人；失敗可見且保留草稿；真發送另取授權與交付證據。 | 待細化：provider、憑證／權限、發件人、最終確認、重試與送達狀態。 |

### FAM｜家庭、Student Profile 及 Login

| ID／register 原狀態 | 主文／來源節 | 業務效果 | 現況缺口 | 可驗收流程 | 待細化／不能自行推定 |
|---|---|---|---|---|---|
| [FAM-01](https://app.notion.com/p/3f5936c332a9812db350cb8515c1fc01)：已確認 | §14.5；EX13；register PDF 第5頁 | 一個家庭登入對多個獨立 Student Profile；課程、Attendance、堂數、付款不合併。 | 現有 auth user ≠ 家庭／學生模型；沒有共用家庭關聯與成員切換。 | 同一家長切哥哥／弟弟，兩人課表／堂數／交易獨立；外家庭無權讀。 | 家庭交易共用視圖及多監護人權限。 |
| [FAM-02](https://app.notion.com/p/3f5936c332a9816491eac62e77ce8a2f)：已確認 | §14.5、14.7；EX13；register 對話補充 | 老師從任一學生 Profile 關聯兄弟姐妹，各成員反向查詢同一家人。 | 缺 Family 關聯、驗證與可追蹤增刪記錄。 | 從哥哥加弟弟→兩端均見關聯；錯家庭添加被阻擋或待核實，不能因同電話自動合併。 | 解除關聯、監護驗證、誰有權操作。 |
| [FAM-03](https://app.notion.com/p/3f5936c332a981fe9652ea415e320afc)：已確認 | §14.6–14.7；EX13；register 對話補充 | Convert 建立正式學生資料；Student Profile 不等於已啟用 Login。 | demo 付款後 studentList 的推導不能代表獨立手動 Convert；seed users 不代表激活流程。 | Enrollment Confirmed仍Applicant；手動Convert後正式Profile；Login仍Not Activated直到獨立激活。 | 與既有 Family Login 連結及先 Paid 後 Convert 綁定。 |
| [FAM-04](https://app.notion.com/p/3f5936c332a981189a10fa1b0b84c1d9)：已確認 | §14.6；P-16；register 對話補充 | 電話為 Username；老師只見啟用狀態，複製激活鏈接；家長兩次設密碼，老師只能 Reset。 | 目前只有seed email/password登入；缺電話登入、激活與Reset，不能顯示原密碼。 | 本機一次性token→兩次密碼確認→電話登入；用過token不能重用；Reset不洩漏原密碼。 | 一次使用／限時屬建議安全保護；監護驗證及 FAM-05 激活前置條件仍待確認。 |
| [FAM-05](https://app.notion.com/p/3f5936c332a9816481fee97b60d0baec)：待討論 | §14.6、14.8；P-16；register 對話補充 | 首次激活是否必須已收款仍有矛盾，不把任一路徑當已定。 | 新激活流程未建；規則決策未有結論。 | 先記決策；再驗 Convert後可激活或Paid後才可激活的已選規則，未定前不給「完成」。 | 待討論：Paid前置 vs Convert獨立可激活。 |
| [FAM-06](https://app.notion.com/p/3f5936c332a981dd991ec0fe24f0109b)：已確認 | §14.7；EX13；register 對話補充 | Add Family Member 讓現有家庭加孩子，明選 Trial 或 Direct Enrollment；不是 Invite a Friend。 | 缺家庭入口及兩條獨立報名路由。 | 已有家庭新增弟弟→可選兩路；不跳往好友Referral，不建立另一套家長Login。 | 非監護人關聯及資料驗證。 |
| [FAM-07](https://app.notion.com/p/3f5936c332a981f8b9f7ca465f964749)：已確認 | §14.7；EX13；register 對話補充 | 新增孩子試堂→有效 Slot→提交即佔 Trial 名額→老師跟進→手動 Convert。 | 缺正式 Trial Request／配額／Family Applicant 關聯。 | 弟弟試堂申請即佔1席；老師收到To-do；Convert保留試堂歷史及原家庭Login。 | Trial資格、拒絕釋放、延後審批與關聯驗證由core共同驗。 |
| [FAM-08](https://app.notion.com/p/3f5936c332a9817b85d7e5914e4085b8)：已確認 | §14.7；EX10、EX13；register 對話補充 | 弟弟直接報名跳過試堂；老師改項目／金額，Confirm Request後已可手動 Convert，不等 FPS。 | 缺 Direct Enrollment＋Request／Applicant＋獨立Convert模型。 | 弟弟不產生Trial配額；Confirm Request後手動Convert可成功，但未Paid不正式入班。 | 先Paid後Convert的記錄綁定與顯示。 |
| [FAM-09](https://app.notion.com/p/3f5936c332a98106ac80c943012e1a7a)：已確認 | §7.5、14.7–14.8；EX10、EX13；register 對話補充 | Confirm Payment正式同步課程；所有 Request／Payment／Order動作均不得自動Convert。 | demo booking將Paid與Student List推導混在一起，不符合。 | 驗 Convert→Paid 及 Paid→Convert 兩序列（綁定方案確認後）；最終一份Profile、一筆收款、一套課包／座位。 | 先付款臨時身份關聯、退款逆向與家長可見性。 |
| [FAM-10](https://app.notion.com/p/3f5936c332a981459be2cfc361cbffca)：已確認 | §14.7；EX13；register 對話補充 | 同家庭第二／三孩子沿用同一家長電話／密碼，孩子資料獨立。 | 缺賬戶—多Profile關係；現有單一db.student不夠。 | 新增兩孩子後user/Login數量不增加；家長同一憑證可切換三份Profile，剩餘堂數互不污染。 | 多監護人及家庭解除關係。 |
| [FAM-11](https://app.notion.com/p/3f5936c332a9810e91f3cd92fbc35f0e)：待細化 | §14.5、14.8；P-18；register 對話補充 | 家庭關聯須驗證，防止跨家庭錯綁；多監護人／解除規則待定。 | 沒有可核實的家庭授權模型／監護驗證。 | 造兩家庭同電話或同姓；不得自動合併；按已定驗證規則建立／撤回授權並記錄。 | 待細化：Family ID設計、身份證明、兩家長、解關聯、電話變更權限。 |

### O｜老師主動訂單

| ID／register 原狀態 | 主文／來源節 | 業務效果 | 現況缺口 | 可驗收流程 | 待細化／不能自行推定 |
|---|---|---|---|---|---|
| [O-01](https://app.notion.com/p/3f5936c332a9816983d7e226175ff4aa)：已確認 | §16.1–16.2；EX16；register PDF 第6頁 | 老師可直接選學生／Family及Fees/Courses/Products、日期／堂次、折扣／金額並Send。 | 缺共用主動Order、Products、收件家庭與發送記錄。 | 無學生Request也能開單；家長見正確項目／日期／金額與通知；Send不Paid／入班／Convert。 | Product、Fee選擇／名額報價版本與All/Single細節。 |
| [O-02](https://app.notion.com/p/3f5936c332a98185bed6fd518fd3c548)：已確認 | §16.2–16.3；EX16、EX17；register PDF 第6頁 | 家長Confirm Order只接受訂單並通知老師，非付款確認。 | 沒有家長Order Response與獨立Order/Payment狀態。 | Confirm Order後Parent Confirmed且Payment仍未Paid，座位／課包不變，老師收到同單通知。 | 未付款到期與後續修改是否重Confirm。 |
| [O-03](https://app.notion.com/p/3f5936c332a981b0a15dc3c4548ad9a3)：已確認 | §16.2；EX11、EX16；register 對話補充 | 主動訂單同樣接受FPS人工核實／WhatsApp或Portal Slip，不自動到賬。 | 沒有Order付款憑證關聯；不可把教材上傳當收款。 | 家長上傳到該Order→授權老師可看，仍未Paid；人工Confirm Payment才進下一步。 | Slip格式、安全與提醒沿F-10。 |
| [O-04](https://app.notion.com/p/3f5936c332a98108aa21efc26abb4c94)：已確認 | §16.2；EX16；register 對話補充 | 主動訂單只有老師Confirm Payment才Paid與課程同步，手動Convert獨立。 | 缺 Order/Payment/Enrollment一致交易與防重試。 | 重按／斷線重試Confirm Payment只入帳、佔位、課包各一次；所有老師／家庭課表一致。 | 先Paid後Convert、退款/撤銷與Teacher權限。 |
| [O-05](https://app.notion.com/p/3f5936c332a98119bd5af999d8e93b22)：已確認 | §16.4；EX16；P-24；register PDF 第6頁 | 開課程單可自由選 All Lessons／Single Lesson，不固定4堂、不強制整期。 | 沒有訂單課次選擇；現有課程price模型不能自動推定訂單堂數。 | 選擇1堂只記所選seq/date；All按實際課期生成清單；比較非4堂例子，不改變原課程設定。 | 日期界面、資格／capacity final check、單堂多堂收費。 |
| [O-06](https://app.notion.com/p/3f5936c332a98112b843ce6907105600)：已確認 | §16.2–16.4；EX17；register 對話補充 | 家長可Confirm、Reject、Request Changes；修改原因可空白，Confirm/Reject通知老師。 | 沒有三種Response及必填邊界、Order歷史。 | 四場景：Confirm、Reject、有原因修改、空原因修改；均保歷史，不自動Paid／Convert；老師見更新。 | Request Changes的To-do為建議；再Send／再Confirm流程見O-07。 |
| [O-07](https://app.notion.com/p/3f5936c332a9815c8a8ac67e6ba15d17)：待細化 | §16.3–16.4；EX17；P-25–26；register 對話補充 | Request Changes已明確可空原因；重新出單與長期未付款機制尚未定。 | 沒有修訂單、版本關係、再發送／過期模型。 | 先決定修訂版本和重確認策略；驗同單歷史不會重復Paid，舊版不能覆蓋新版；空原因不能被待定政策擋住。 | 待細化：再Send、再Confirm、催繳/到期/撤銷。 |

### S｜Student／Parent Portal

| ID／register 原狀態 | 主文／來源節 | 業務效果 | 現況缺口 | 可驗收流程 | 待細化／不能自行推定 |
|---|---|---|---|---|---|
| [S-01](https://app.notion.com/p/3f5936c332a981a69dccc1d17e403fe7)：已確認 | §14.1、2.1；register PDF 第5頁 | 同一套系統按角色進入Parent/Student、Teacher或Admin；本輪以網站角色入口驗。 | 部分：共用登入／角色路由已存在；Family/授權課堂及nativeApp未覆蓋。 | 本機同一網址分別登入各角色；默認老師只自己／授權，家長只自己的Family；未來app復用接口。 | Native iOS只預留；role動作＋資料範圍細則需落定。 |
| [S-02](https://app.notion.com/p/3f5936c332a98199a95ecc6d3a257aa0)：已確認 | §14.1；register PDF 第5頁 | 顯示已登記Profile、課程/班別/期數/歷史/日期及剩餘堂數，不補虛構資料。 | Profile與學生課表仍有demo邏輯，缺共用真實Enrollment/History。 | 用一家庭兩孩子且部分字段空白；切換Profile只見實際資料／課表／各自Remaining，不填示範電話或假零。 | 欠資料顯示與剩餘堂數/Attendance扣堂政策。 |
| [S-03](https://app.notion.com/p/3f5936c332a981adb682f69f0b6b3e15)：已確認 | §14.1、14.11；EX12；register PDF 第5頁 | 名稱固定Payment History；Transaction Details只展示真實已生成/保存的Receipt。 | 舊界面是Payments & profile demo，無交易收據記錄或授權下載。 | 家長見授權交易狀態；未生成不假稱有PDF；已保存正確交易PDF可重開下載、別家庭直ID不許讀。 | Save文件與系統歷史保存的定義、版本保留。 |
| [S-04](https://app.notion.com/p/3f5936c332a981e1968dc1c3a0ef142b)：已確認 | §14.1–14.2；EX14；register PDF 第5頁 | 新Course/Competition/Workshop資訊使用統一後台來源。 | 部分：共用Course存在；Competition／Workshop資訊及Student欄目未接。 | 後台更新已發佈活動→Website和授權Student Portal同步同內容；草稿不可公開。 | 資訊字段、頻道與發佈狀態。 |
| [S-05](https://app.notion.com/p/3f5936c332a9813891e2cee1343d0d6f)：已確認 | §14.2；EX14；register 對話補充 | Save不等於Publish；老師按需要發佈到Website/Student Portal。 | onlineStore開關僅課程可見，不是完整活動發佈系統。 | Save Workshop不公開→顯式Publish才展示；跨端讀取同記錄，撤回行為待規則確定。 | 狀態名稱、雙頻道開關、撤回及授權。 |
| [S-06](https://app.notion.com/p/3f5936c332a981c3aa09d60b300dc1bf)：已確認 | §14.3；EX07；register 對話補充 | 家長對某孩子某一課次申請Rescheduling/Sick Leave，相關老師收到Request/To-do。 | 舊調課demo非Family授權、StudentSession及正式審批；無共用Requests。 | 弟弟seq2申請→只有該StudentSession受影響，哥哥／同班其他人／Capacity不變；老師詳情可跟進。 | P-20/S-09：截止、審批及扣堂。 |
| [S-07](https://app.notion.com/p/3f5936c332a981d8b322eb5d706c2d34)：已確認 | §14.4；EX14；register 對話補充 | Remaining達老師設置閾值時通知續報，不自動續費。 | 缺規則設置、真實Remaining及通知去重。 | 閾值2，3→2產生對應家長提醒；Absent不能自行減堂以觸發；無訂單或自動扣款。 | 全局/每課/每生、重復閾值通知及課堂扣堂政策。 |
| [S-08](https://app.notion.com/p/3f5936c332a9817caffff3255c5878b6)：待細化 | §14.2、14.8；P-19；register 對話補充 | 發佈狀態與Website/Portal獨立開關尚未確認。 | 現有課程可見開關不足以代表已定狀態流程。 | 先定各狀態與channel政策；再驗證Save/Publish/撤回及兩渠道邊界。 | 待細化：Draft/Pending/Published是否採用、獨立開關。 |
| [S-09](https://app.notion.com/p/3f5936c332a981eba450c4a2ee72d0ae)：待討論 | §14.3、14.8；P-20；register 對話補充 | 調課／病假具體截止、審批、Remaining扣減政策未定。 | 核心請求尚未接；不能把demo make-up或Paid推導當已定扣堂。 | 先選確定政策再測試；當前確認部分仍需個別請求+通知，不能憑空釋放名額或減堂。 | 待討論：截止、審批權限、病假/Attendance扣堂及補堂資格。 |

### ST｜Clock、Payroll、Leave 及代班

| ID／register 原狀態 | 主文／來源節 | 業務效果 | 現況缺口 | 可驗收流程 | 待細化／不能自行推定 |
|---|---|---|---|---|---|
| [ST-01](https://app.notion.com/p/3f5936c332a98150950ee1557faaa861)：已確認 | §17.1；EX18；P-27；register PDF 第7頁 | Admin設置中心點；≤100m正常、>100m外勤，兩邊都允許Clock。 | 無共用GPS設定、Clock API或位置狀態。 | 可控測試定位80/100/150m：都可提交，前兩正常、150外勤；兩端顯示真實點擊時間/距離標籤。 | 定位失敗/誤差、室內、多地點；本機模擬不證明iOS實際定位。 |
| [ST-02](https://app.notion.com/p/3f5936c332a981dd8203c4b27fc1b2a0)：待細化 | §17.1；EX18；P-28；register 對話補充 | 單一Clock按鈕按課程及Admin前後窗口自動給本次Check In/Out並即時回顯。 | 沒有標籤判定／窗口設定；多次事件模型未接。 | 14–15課+15/30窗口例：13:50 In、15:20 Out、18:00新In；老師即見類型、時間、正常/外勤。 | 待細化：過早、無課、連續/重疊、跨天及手改邊界；15/30不是默認。 |
| [ST-03](https://app.notion.com/p/3f5936c332a98113b28bf78e372af35c)：已確認 | §17.1；EX18；register 對話補充 | 課表只幫助判別標籤，不是Clock可否按的限制；外勤按設置補資料仍能成功。 | 沒有Clock提交與設置校驗。 | 課程外時刻可成功Clock；150m不當禁止圍欄；開啓的外勤必填完成後保存。 | 無課標籤判定與定位拒絕處理。 |
| [ST-04](https://app.notion.com/p/3f5936c332a98119b1c5dc5464ac7eb4)：已確認 | §17.1；EX18；register 對話補充 | 獨立Clock Events按時間保存；不強制配對、不補Out、不改舊In標籤。 | 沒有持久事件／Admin歷史列表。 | 13:50 In與18:00 In兩筆重開仍在；不能自動生成15:00/15:30 Out或改第一筆。 | 事件編輯權限、標籤異常及審計。 |
| [ST-05](https://app.notion.com/p/3f5936c332a98178ba59e4cc70549b17)：已確認 | §17.2、17.2.1；EX20–22；register PDF 第7頁 | 同時支持Hourly／Monthly；Admin覈算，老師按月見本人Salary Record與PDF Payslip。 | 無Staff薪資Profile／Payroll／Payslip；收入Excel不是工資系統。 | A時薪+B月薪建立月度草稿→Admin審→各老師只見本人已授權記錄/對應PDF。 | 費率/薪資類型生效、月薪假期待遇、鎖定/發放、捨入與法務確認。 |
| [ST-06](https://app.notion.com/p/3f5936c332a9819ab577f8cee2f4a897)：待討論 | §17.2–17.3；EX22–23；P-29；register PDF 第7頁 | register仍待討論，但後文已確認統一四種假期、兩入口、History/Overlay；餘額/假期待遇待定。 | 無共用Leave；不能因原ST06待討論而把已確認審批主流程整項跳過。 | 按後文驗四種類型Teacher申請/Admin登記；批准標示並存歷史；不自動扣薪/取消班次。 | 保留原待討論狀態；Public Holiday/AL/補假餘額、薪資和證明附件未定。 |
| [ST-07](https://app.notion.com/p/3f5936c332a981fa9ec1f820deba4c4d)：已確認 | §17.1；EX19；P-27；register 對話補充 | Admin獨立開關Require Photo/Require Reason；僅外勤且開著才必填。 | 無設置／照片事件綁定與授權查看。 | 150m四組合逐一驗；80m不強制；成功Event雙方見標籤和按設置所附圖/原因。 | 默認開關、相機/相冊/權限、格式/尺寸/保存期。 |
| [ST-08](https://app.notion.com/p/3f5936c332a98151b702d42f523a48da)：已確認 | §17.2.1；EX20；register 對話補充 | Scheduled和Actual兩欄獨立；基本工資時薪按排班，月薪固定，不自動用Actual。 | 無月度排班匯總／實際覈實時段／工資計算。 | 排60、Clock75顯示兩值，默認基本計薪60；月薪老師仍固定Base；缺Out的Actual=N/A。 | 異常事件組合、取消班次如何計薪、時區/捨入。 |
| [ST-09](https://app.notion.com/p/3f5936c332a981bbba66e3837f839844)：已確認 | §17.2.1；EX20；register 對話補充 | 遲到分鐘與每分鐘金額由Admin配置覆核，不能用百分比；適用/合法性尚待確認。 | 無遲到認可、扣款配置或審批記錄。 | 僅用虛構獲批准測試政策驗證10min×2=20與Admin確認；未定/未批准不實際自動扣款。 | 法律／合同適用由用戶另行確認；不把示例2元當合法默認。 |
| [ST-10](https://app.notion.com/p/3f5936c332a981bea4ecdecbea11eda6)：已確認 | §17.2.1；EX20；register 對話補充 | 早到不自動加錢、晚走不自動OT；Admin批准分鐘/小時後才進入OT Pay。 | 無OT申請/認可記錄與計薪規則。 | Clock75對排60，批准0/5/15分別算相應已批OT；沒有批准不加薪。 | OT單價、分鐘/小時換算、審批權限與修改審計。 |
| [ST-11](https://app.notion.com/p/3f5936c332a981749138eed9b30f1750)：已確認 | §17.2–17.2.1；EX20；register PDF 第7頁 | 老師按月只見本人薪金及對應PDF，Admin審月度明細和應付金額。 | 無共用月度Salary Record/授權Payslip下載。 | A不能直接ID讀B薪金/PDF；Admin見全體；選不同月不會取錯文件，未生成不假稱存在。 | 已批准版本、發放/鎖定、修訂及PDF字段。 |
| [ST-12](https://app.notion.com/p/3f5936c332a981c0ae21eaf5c7072e89)：待細化 | §17.1、17.2.1；EX20；register 對話補充 | 缺Out/多In保留獨立事件，Actual須待覈實，不虛構時段。 | 沒有異常待覈實隊列或Payroll認可時段。 | 13:50 In+18:00 In不是250min工時；N/A不當0小時或自動扣薪；Admin決策另存不改原Event。 | 待細化：事件配對審核、無課/跨天、Payroll引用。 |
| [ST-13](https://app.notion.com/p/3f5936c332a981b18243c4fe3b5ee33a)：已確認 | §17.2.1；EX21；register 對話補充 | 每位Teacher Profile由Admin分別設置Hourly Rate或Monthly Base Salary。 | 排課老師資源≠有薪資的Staff/Profile或Login，當前未接。 | A100/hr×Scheduled80hr=8000，B月薪18000即使Scheduled50hr仍18000；兩類同時可存在。 | 類型/費率變更生效日、歷史快照與月中變動。 |
| [ST-14](https://app.notion.com/p/3f5936c332a9819ca4bcc0ab9ee8437c)：已確認 | §17.2.2；EX22；register 對話補充 | 老師為自己申請Sick Leave日期/範圍；Admin收到通知+To-do並Approve/Reject。 | 無Leave Request／審批／通知API。 | B提交病假→Admin待辦→批准/拒絕均保歷史；B不能替C提交或改自己的審批。 | 理由/證明、最小單位、審批通知、撤回修改。 |
| [ST-15](https://app.notion.com/p/3f5936c332a9814ba7c9e091097b2ffb)：已確認 | §17.2.2、17.2.5；EX22、EX25；register 對話補充 | Approved Sick Leave顯示在本人及Admin日曆，History保留並列受影響原課次。 | 排課已共享但沒有Staff Leave overlay/affected sessions。 | 批准A假期→A/Admin標記及affected課程；B/學生不無故有請假；原座位/課次不刪。 | 導出/打印、撤回和更改；代班明示按ST21/22。 |
| [ST-16](https://app.notion.com/p/3f5936c332a9818499d5c87f521ac15f)：待細化 | §17.2.2、17.2.5；EX22、EX25；register 對話補充 | 病假工資與證據等未定；manual代班主流程已在後文確認，不能全推遲。 | 無假期工資關聯／證據；代班關係和權限待接。 | 病假批准不自動扣月薪／隨機派B；Admin按已確認入口逐堂代班，保原Leave記錄。 | 待細化：有薪/無薪、工資、文件、導出；代班衝突/通知見ST23。 |
| [ST-17](https://app.notion.com/p/3f5936c332a98191b2d6de8241328523)：已確認 | §17.2.3；EX23；register 對話補充 | Sick/Personal/Annual/Compensation Leave共用同一結構；Teacher申請及Admin登記均有。 | 無統一Leave Type／Request／Record。 | 四類型×兩入口建立；同一History可查，不拆重復模塊；備注不冒充Leave。 | 公眾假期規則、單位、餘額與工資；具體狀態字段可設計但不能代替確認。 |
| [ST-18](https://app.notion.com/p/3f5936c332a981168a0dd3a1ae05a8a1)：已確認 | §17.2.3；EX23；register 對話補充 | 老師提交假期→Admin通知/To-do→Approve/Reject；批准後才有Overlay。 | 無權限範圍和審批過程。 | 提交時Pending不顯示Approved；Approve才標；Reject保記錄不假稱獲批；跨teacher訪問攔截。 | 撤回/改期、證明、通知、多人審批衝突。 |
| [ST-19](https://app.notion.com/p/3f5936c332a981e192dac873e6070e0f)：已確認 | §17.2.3；EX23；register 對話補充 | Admin直接為某Teacher確認假期，無需老師先提交；存History並同步。 | 無Admin Direct Entry，與Teacher申請入口未區分。 | Admin給B17Oct補假→History標Admin Entry與操作人／時刻，B日曆同步；不造Teacher申請。 | 更正/撤銷、範圍及審批狀態命名。 |
| [ST-20](https://app.notion.com/p/3f5936c332a98176ad50fe2d88cec86e)：待細化 | §17.2.3、17.3；EX23；P-29；register PDF 第7頁 | AL Remaining與補假記錄應能查看；獲得/扣除/回補規則未定。 | 無餘額賬本，不能從請假標籤自行推金額或假期餘額。 | 在規則確認後核對初值+獲批變化+撤回；規則未定顯示待覈實，不假填0或固定天數。 | 待細化：初值、累計、公眾假期資格、單位、回補、待遇。 |
| [ST-21](https://app.notion.com/p/3f5936c332a981ec96f6dbc0fc257963)：已確認 | §17.2.5；EX25；register 對話補充 | 新課/試堂選有Approved Leave的A須主動提示Teacher Unavailable並可改選B。 | ID資源可作基礎；缺Leave衝突、代班選擇與Teacher賬戶關聯。 | A已批15Oct病假，新建14–15試堂選A→明示衝突→Admin選B；不能靜默略過或隨機派人。 | B同時間有課/假期是攔截、提醒還是強制安排；多選老師如何處理。 |
| [ST-22](https://app.notion.com/p/3f5936c332a98142bcd4fa13f42078d6)：已確認 | §17.2.5；EX25；register 對話補充 | 已有課之後批准A假期須列Affected Sessions/Assign Substitute待辦；只改被選Session，同步B/Admin/教師色。 | 現有series single/following不等於完整代班與授權；缺persistent To-do、Leave、教師顏色。 | 8/8 Full課A→批假→選特定seq由B代；B/Admin課表與主色變，ALeave保留，8/8紅點/學生/日期仍原樣；未處理課次待辦繼續在。 | 批量代班、任務關閉規則、家長通知；不能用series全改代替單堂。 |
| [ST-23](https://app.notion.com/p/3f5936c332a98101bec1fbcdccc5abed)：待細化 | §17.2.5、17.3；EX25；P-29；register 對話補充 | 代班衝突、批量、家長通知/權限尚待定；不自動隨機指定B。 | 無可配置／明確的代班availability策略與通知鏈。 | 規則確定後驗B撞課/請假、未安排離頁待辦追蹤、逐堂授權；未定不能假稱可用或強制指派。 | 待細化：禁止/提醒/override、跨日、多課選擇、通知與費率/OT關係。 |

## EX09–EX25 的主流程閉環

| 示例 | 本地可驗收結果 | 關聯 ID／未定邊界 |
|---|---|---|
| EX09 Coupon | 100−20=80，家庭端／老師審核一致，有唯一券—Request關聯 | F-08–09；不能自行決定多券、重用、退款回補 |
| EX10 三動作 | Confirm Request未Paid／未排課；Confirm Payment只同步課程及Paid；手動Convert不重複收款／入班 | F-01–07、FAM-08–09；先Paid綁定待定 |
| EX11 FPS | WhatsApp線下／Portal Slip兩途徑；上傳不改Paid；只人工Confirm Payment改狀態 | F-10、O-03；檔案政策待定 |
| EX12 PDF／Email | 常駐PDF Receipt；Save最新PDF；Email預覽正確To、Subject、Body、PDF附件；本機outbox明示未對外 | F-04–05、11–13、S-03；不是無附件mailto |
| EX13 家庭弟弟 | 同一Login加獨立Applicant；Trial/Direct二選一；Convert手動；哥哥堂數不變；不多建密碼 | FAM-01、03、06–10 |
| EX14 發布／續報 | Save不公開；Publish才同步；Remaining=2才按設定提醒，不自動續費 | S-04–08；發布狀態、通知去重待定 |
| EX15 天氣 | 忠實保留待討論；通知方向不等於已定批量取消／補堂／釋放名額 | 與 core 天氣項交叉；不擅自按例子實作政策 |
| EX16 主動訂單 | 老師Send→家長Confirm→人工FPS→Confirm Payment；整期／單堂按實際選項，Convert仍獨立 | O-01–05；不固定4堂 |
| EX17 三種回覆 | Confirm／Reject通知老師；Request Changes有原因／空原因都能成功且不Paid | O-06–07；再Send／再Confirm待定 |
| EX18 Clock | 80／100m正常、150m外勤皆可Clock；13:50 In、15:20 Out；18:00新In不改／補舊事件 | ST-01–04、12；邊界標籤/定位待定 |
| EX19 外勤設定 | Photo/Reason四組開關只強制已開項；正常範圍不受外勤必填影響 | ST-07；不是確定預設值 |
| EX20 排班／實際／OT | 排60、Clock75分開；基本薪按排60；OT僅Admin批准；缺Out的Actual待核實 | ST-05、08–12；不能以示例確定扣薪合法或率值 |
| EX21 薪資類型 | A時薪100×Scheduled80=8000；B月薪18000不隨Clock或Scheduled50改成時薪 | ST-13；數字僅測試例，生效規則待定 |
| EX22 Sick Leave | B申請→Admin通知/To-do→Approve才Overlay＋History；Reject不標Approved；不自動扣月薪或取消學生課 | ST-14–16 |
| EX23 統一Leave | 四類Teacher申請／Admin直接登記均保存來源及審批；班次和座位不被假期自動改動 | ST-17–20；AL/補假餘額及待遇待定 |
| EX24 內部Remarks | Admin日期/Slot文字備忘；Regular Teacher只能授權範圍；Student/Parent UI、API及檔案都不得讀；不觸發Leave/Attendance/To-do狀態 | TM-01–03逐ID見core；與學生Remark/Color Sticker分開 |
| EX25 代班 | 新課選已Leave的A主動警告；既有課批准假期列Affected Sessions；Admin只替指定Session選B；B/Admin課表與教師主色同步，A假期保留 | ST-21–23；8/8 Full紅點、試堂申請／學生課次／日期不變；B衝突與通知待定 |

## 最小操作驗收順序與跨模組保護

1. **身份及授權先行。** 正式Applicant／Student Profile／Family Login／Teacher Login／排課Teacher Resource分開識別。Admin、四老師、兩個不同家庭用獨立 cookie 登入；查URL/API/附件不能越權。普通老師只見自己的／Admin授權的課堂與相關學生／申請，家庭切孩子不混剩餘堂數；登出、換人及延遲舊回覆清私有快取。
2. **共用交易核心。** 本機建 Order/Payment Request → Items/Amount版本 → Confirm Request/Parent Response → FPS Slip → 人工Confirm Payment → Enrollment／座位／課包／雙端Timetable及Payment History。一筆操作出錯不能只留Paid而未入班；重按、並發、斷線重試不重複佔位／交易。最終名額與資格在Confirm Payment或課務Confirm時再次檢查，具體被拒後處理先確認。
3. **家庭與Convert。** Trial及Direct兩路可共用Family Login；Convert只由老師手動。先Paid綁定方案確認後才把兩序列列「全部通過」。電話相同不可自動合家庭；無Login不虛構密碼或已激活狀態。
4. **Receipt與通知為主要效果。** PDF正確內容／金額／付款狀態／交易ID，可重開實際保存的歷史文件；通知須有可保存的對象、內容與狀態，單個toast不能證明派發。Email測試adapter必須保存正確PDF附件，可預覽及模擬失敗重試；標明未對外、未實際送達。正式發信／FPS銀行校驗不在本輪本機實收證據內。
5. **Staff操作。** 排課resource只是前置；Clock獨立事件、Location分類、Photo/Reason設定、Staff Profile薪資類型、Leave／Affected Sessions／手動代班、月度Payroll與Paid Receipt的PDF互不混用。文字Remark不改正式狀態；Leave或代班不改學生座位／Full，教師主色與容量小標記獨立。
6. **本機持久性及規模。** 使用虛構4老師／300 active學生／6課程（3–18歲）的資料，兩個瀏覽器身份操作後重開服務仍一致；名單可搜尋／分頁，不因畫面未載入就假報0／漏課。性能閾值另由root訂定並量測，不在此臆造已達速度。本輪手機驗收是responsive網站；模擬GPS/時鐘結果不代表native iOS或真手機定位已完成。

## 待決政策清單（不阻止已確認主流程盤點）

- 首名學生Activation是否以Paid為前置（FAM-05）；先Paid後Convert的穩定身份及家長可見性。
- 家庭驗證／解聯繫／多監護人與電話變更。
- Attendance／病假／調課截止、扣堂、退款／取消的逆向處理與席位政策。
- Coupon使用次數、有效期、疊加、超額、改價和退款回補；Order修訂、再發、再次接受、長期未付款到期。
- 付款前文件正式名稱、Receipt/Payslip編號與版本／保存策略；Email服務／權限／實際送出與失敗交付證據。
- Publication狀態及Website/Portal頻道；續報／催款通知頻率及去重。
- GPS精度/拒絕、無課/連堂/重疊/跨天標籤；照片來源/大小/期限與Clock編輯權。
- 薪資類型／費率變更生效、OT單價、捨入、異常Actual審核、月薪假期待遇；任何實際扣款政策的法律／合同適用須另行確認，本檔不作判斷。
- 年假／補假初值、累積、扣減、回補、Public Holiday；代班B可用性、override、批量、家長通知與多人編輯衝突。

未決細節不能被舊minor清單吞掉已確認的主要功能，也不能以「有開發預留」代替實際完整工作流程驗收。
