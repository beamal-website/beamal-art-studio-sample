# 公開 Trial 提交：獨立 HTTP／SDK／實際 src 驗收

2026-10-16；目前工作區製作中版本，並非最終 freeze 或啟用聲明。Research／驗收者只寫 `/tmp`，沒有修改 repo、使用者 DB、Git、瀏覽器或現有服務；沒有 full suite／build。實際 HTTP 服務由新 `/tmp/beamal-trial-independent-*` 測試庫建立、限 loopback、各案關閉並刪除，與使用者資料無關。

## 結論

目前固定 **8 個真 HTTP／實際 SDK 案 + 8 個 full-src host 案 = 16／16 GREEN**。查出的清單／詳情返回問題已保留原失敗證據並由 Root 修正，原斷言不改後複驗通過。現無新增阻擋發現；本報告覆蓋的是當前版本及列明範圍，不能取代 Root 最終同版 full checks、真 GUI 或必填政策確認。

**正式 `trialFormPolicy:null` 仍停用。** 選定的測試政策只在新隔離 fixture 注入，不表示使用者已選定政策或功能已正式開放。

## 獨立真 HTTP／SDK

腳本：`/tmp/beamal-trial-independent-current-20261016.mjs`
最後紀錄：`/tmp/beamal-trial-independent-current-20261016-v3.log`，8／8，exit 0，5.488 秒。

1. 預設政策 null：GET policy 為 null；有效空白以外資料 POST 仍 503／TRIAL_NOT_OPEN，People、audit、hold、申請、event、receipt、order、session、account-link 全不新增，work 沒假待辦／通知。
2. 同一最後 Trial 名額的兩個並行 HTTP 只一個 201、一個 409；只有一個 Applicant／hold／request。公開 ACK 僅 outcome/reference；不是 Student／Paid／正式入班。原 key 重播無新增，改 payload 同 key 拒絕。匿名／Student／其他老師不能讀聯絡資料。負責老師 Reject 釋放恰好一個 Trial hold，保留事件與 Applicant；原 Reject key 重播無第二次釋位；撤本人 link 後即使有 Course read grant，連舊 Reject receipt replay 亦拒絕。
3. 正式 linked occurrence 調派老師後，舊負責老師失去 request 存取，新負責老師可讀／Reject；以現任實際資源關係授權，不以申請 snapshot 的舊老師名稱當權限。
4. 真 HTTP 分段 body：送出 headers／部分 JSON 後撤 teacher link，補完正文；先前 session 授權不能繞過 body-await 後重核，404、原申請 pending、hold 仍一個。
5. 在隔離庫注入 submitted-event INSERT 失敗：即使流程已開始 hold／Applicant，HTTP 5xx 後所有目標表回復原數量；移除測試 trigger 後可正常提交一次。
6. 關閉、重啟同一隔離庫並改 policy null：舊 request key 仍只讀回原 receipt，不新增或重新佔位；新 key 503。申請、介紹人及 exact Slot 仍持久存在。
7. 使用 **actual API SDK + real HTTP**：伺服器 201 已 commit 後，僅使瀏覽器端 response.json() 拋錯。結果維持 uncertain、原 payload／key 可重試，第二次取得原 receipt，庫中始終只有一筆申請。
8. 在 isolated Reject event INSERT 注入失敗：已釋放 hold／版本更新均 rollback；pending/version1／held1 保留，5xx 不洩露 SQL 或 probe 原文。移除 trigger 後原 key 重試完成一次，version2／held0／兩個歷史 events。

初版紀錄 `/tmp/beamal-trial-independent-current-20261016.log` 的 7 個 failure 全是驗收 fixture 誤用不存在的 store.createUser；已改用 createApplication 的 seedUsers 明確建立測試身份，保留舊 log，**不是產品 RED**。v2 7／7；再新增第8個 Reject rollback 案，v3 8／8。沒有透過刪減斷言追綠。

## Full actual src／原生表單與返回

固定腳本：`/tmp/beamal-trial-independent-fullsrc-20261016.mjs`
環境：`/tmp/beamal-trial-current-fullsrc-harness.mjs`。
最後紀錄：`/tmp/beamal-trial-independent-fullsrc-20261016-v4.log`，8／8，exit 0，0.258 秒。

環境從目前正式 flows fixture 的一般 app 建立方法取得 VM 與導覽／事件適配；停止註冊製作者測試，再讀入 **實際完整 src.js**，沒有另寫或複製一套 Trial controller 作 oracle。必要新增 imports 只注入 `/tmp` VM。清單／詳情的 modal 控制項由 actual renderer HTML 解析，每次 innerHTML 真重置 scroll 並移除舊焦點；不是沿用同一假控制項讓返回假通過。Public native FormData 由各欄實際 value 取值。

1. 清單第二頁、scroll438、focus request27 → 詳情由頂部開始；Back 回頁2、scroll438、同 request27 按鈕。
2. 詳情讀取中 actual go('/classes')；晚到私有 response 不復活 overlay／聯絡資料。
3. Reject 503 uncertain：Back 不能換申請或清原 key；第二次送完全同 id/version/key。其間 actual applySharedUser 改 accessRevision，本次晚 ACK 不復活 overlay／成功或私資料。
4. Review Rejection → Back 同 record、不寫入；其後原來源404則清 canonical contacts，不以舊內容繼續可操作。
5. 獨立返回案例：頁2 scroll438 → detail scroll87 → Back 必須438且回正確 row focus。
6. 原生 FormData 保留姓名空白、referrer、備註換行等 raw 草稿；Review → Submit 用確切 course/slot／實際 operation UUID，成功後重按無第二次 request。
7. policy null 的正常核對及偽造 Submit 均無 send，沒有假成功。
8. 公開 Submit 等待期間 actual route navigation；晚 receipt 不復活成功畫面。

初次 full-src v1 的 4 failure 是環境尚未建立 #modal-root 節點而 defineProperty(nonobject)，已只修測試環境（用正式 querySelector 建節點），不當產品 bug。真正產品 RED 為 v2／v3 以下兩案。

## 真 finding 與修復證據

### 清單／詳情返回位置丟失（Root 已修，獨立通過）

舊 src `trialRequestPosition`／`drawTrialRequests`／`handleTrialRequestAction`（約 :948–986）：只記 listPage，通用重畫把清單的 scroll 帶到詳情，詳情的 scroll 又帶回清單，沒有 list row focus 來源。

- `/tmp/beamal-trial-independent-fullsrc-20261016-v2.log`：3 pass／1 true RED，detail scroll438 而非0。
- `/tmp/beamal-trial-independent-fullsrc-20261016-v3.log`：6 pass／2 true RED；另案確實 Back 為87而非438。
- Root 新增正式回歸後保存 listReturn、detail／換頁 top0；原固定8案 **不改斷言** 重跑 v4 全綠。

### 成功 HTTP、JSON 損壞的結果不明（Root 已修，實際 SDK 獨立通過）

早讀 code 發現 public-trial-submit catch 只把 status0／5xx 視為 uncertain，而 actual SDK 的成功 JSON 解析錯誤為 status201/code service_unavailable；會誤作 definitive stale。Root 在獨立真 HTTP 案開始前已完成自己的正式 RED→GREEN，故**我們不冒稱此案曾獨立 RED**。目前 public helper 與 private Reject 均納入 2xx malformed，真 SDK＋已 commit HTTP 的固定第7案通過。

## 讀取版本

Full-src v4 讀回後：
- `sample/src.js`: `a7e7b26e5f3b5a9d673df2685e682b48a705f4a528b4ab559aa8d0f31c3def25`
- `sample/client/public-trial-submit.js`: `698edcfa42fc8eb57469a11ce64e040366a51ae039b7b54171d34956384a3fdd`
- `sample/server/trial-applications.mjs`: `374cc6f1f88aeff600ef2bedfba99e305f4ce9ee48d09c77aef4682400928d3b`
- `sample/server/app.mjs`: `707004c792d0b1a75ecaa0b573210f75459e8be76905b416c452244921763517`
- `sample/server/available-slots.mjs`: `794e0353d47039d3f080066a44405bb256e813a4eee5d67ffb1ec1c95a4eef2e`
- `sample/server/people.mjs`: `381b1f745f3e5fdc73bf00bd5f3a326cd2253c4b3b8a30e20e933a37d08c718f`
- `sample/client/api-client.js`: `2ff660291e36dbcac4820f371748a6fb3400f3871742761c8bd05f9c048034f3`

其他製作及 GUI 修復仍可能令版本改動；Root 最終 freeze 後如同區有實質新變動，須只重驗相關固定案例。

## 限制／未聲稱

- 沒有親自操作本輪 GUI、讀屏、手機鍵盤、外送訊息或正式 DB；modal parser／VM 不是實際瀏覽器。
- 同 process 兩個獨立 HTTP request 的最後名額競爭已實跑；沒有在我們這份腳本做兩個 OS process 同時 SQLite 寫入，不把 maker worker-thread 證據算作自己的。
- 沒有獨立重驗本片以外全部 Class Full／Trial visibility／public color／多課表組合或整個 300 人負載；只查當前 call chain 與 exact slot。
- 不代表 Trial 結束後 Enrollment Confirmed／Pending Follow-up、家長取消／重排通知、手動 Convert、支付或家庭授權已完成。Applicant／receipt received 不能冒稱報名成功。
- 必填政策依賴仍存在，正式 null Gate 必須保留；沒有自行挑一個測試政策作人類批准。

## 最後 GUI poll 修復後獨立複驗（本節取代上方舊總數／src hash）

Root 在真 GUI 發現「已知來源五秒更新重建彈窗」及「舊 GET 晚於 Reject ACK」後，要求原8個 full-src、原8個 HTTP／SDK 原樣複跑，並新增獨立邊界。

- 固定原8個 HTTP／SDK：**8／8 GREEN**，`/tmp/beamal-trial-independent-current-20261016-final-poll.log`，exit0，7.550 秒；伺服器／SDK source hash 與上方相同。
- 固定原8個 full-src + 新增4個：**12／12 GREEN**，`/tmp/beamal-trial-independent-fullsrc-20261016-final-work-poll.log`，exit0，0.270 秒。
- 最後目前共 **20／20** 獨立案例通過，無新增阻擋發現。

新增第9案使用 actual HTML modal controls，已修正測試 DOM：**每次設定 innerHTML，即使相同字串亦會移除舊控制項**，符合真瀏覽器，而不以測試環境自行忽略相同字串掩蓋 remount。已知同 request 的背景 poll 不切 loading、不換按鈕／body物件、focus／scroll242 保持；未回覆時第二個 poll 不重讀；回覆相同內容後原 target 還可原生 click 進 Reject review。

第10案：先開 request27、開始尚未回覆的 pending GET，以真 delegated button click 進 Review／Reject，取得 version2 Rejected ACK，再放行舊 version1 Pending GET。舊讀取不能改 record、版本、canReject、HTML 或重建舊控制項，亦無第二次寫入。

### 同一 poll 的外層真 finding（已由 Root 修復）

獨立追查同一源路徑發現 `refreshTrialWork` 的 unchanged return 仍經 finally 無條件 `render()`；`ensureSharedPolling` 每5秒呼叫，沒有 modal 的 Course／Teacher workspace 仍被重建，斷 native focus。

- 固定第11案首次真 RED：`/tmp/beamal-trial-independent-work-poll-20261016-red.log`，expected #app innerHTML writes0，actual1；不是純函式 mirror。它以已存在的真 Course 頁控制項為原 target，對 #app innerHTML 設定模擬真 DOM removal。
- Root 另在 GUI 觀察 Account menu 會因 poll 關閉；加正式 regression 後只在可見 source state 改變才 paint。
- 固定第11案原斷言不改，與前10案複驗 GREEN。
- 新增第12案確認沒有因減少重畫而吞掉真錯誤／恢復：已知work→503必須 repaint、count unknown而非0、私有raw錯誤不顯示；恢復時以空revision重讀、清錯誤、精確 request27／count1，必須再次 repaint。通過。

最新 source hashes：
- `sample/src.js`: `5a768209a45f3034998f433b7742b5907b7665f13c7144dfe8ab0720c4ef876e`
- `sample/client/staff-portal-ui.js`: `ccc7b772601da1bbd39ef21fc1ea9f5ca00ae5a17410ce06ff43db3313e01f99`

本輪同樣沒有 repo／使用者 DB／browser／Git 修改，沒有 full suite／build。Teacher home／To-do 的新內嵌 Trial 工作入口只作只讀 source 核對，未把 Root 的2個正式 workspace 測試計入我們的20案；真 GUI 仍由 Root 負責。正式政策 null、開放與結果／Convert／付款等未聲稱仍保持。

## 最後可見範圍修正後（最終 21／21；取代前節總數）

Root 將 `trialWorkVisible` 限於實際 `teacher-home`，排除 Course catalogue／Course detail／Person route：這些頁面只有獨立申請清單入口，不應為隱藏 workSnapshot 拉取或 paint 而關閉原生 Account 菜單。

- 原有12個 full-src 案均保留。第12案的 error/recovery 原 fixture 在 Admin catalogue，依此次明確產品範圍，**只把 fixture 的畫面改為實際 teacher-home**，保留「錯誤及恢復各 paint 一次、unknown 不是0、rawerror 不洩露」全部斷言。這是相依畫面的合約修正，不當作產品 RED，也沒有把 paint 斷言刪掉或改成0。
- 新第13案直接捕獲 `ensureSharedPolling` 註冊的真正五秒 callback，正常完成 session／各來源更新：Course catalogue 與 exact Course detail 沒有新 trialWork API 呼叫；切到真正 Teacher homepage 後才讀一次。不是只呼叫 `trialWorkVisible()` 或用靜態 source regex 當結果。
- `/tmp/beamal-trial-independent-fullsrc-20261016-final-scope.log`：**13／13 GREEN**，exit0，0.454 秒。
- `/tmp/beamal-trial-independent-current-20261016-final-scope.log`：固定 **8／8 真 HTTP／SDK GREEN**，exit0，5.270 秒。
- 最終這輪獨立 **21／21**，無新增阻擋發現。所有原隔離庫已各案關閉並清除；未接觸使用者庫／真服務／瀏覽器／repo／Git，未跑 full／build。

最終核對 hash：
- `sample/src.js`: `3999331fda0e9167e7906b8f4522852101f56c067997875752a70e3ac03b3eff`
- `sample/client/staff-portal-ui.js`: `ccc7b772601da1bbd39ef21fc1ea9f5ca00ae5a17410ce06ff43db3313e01f99`
- `sample/server/trial-applications.mjs`: `374cc6f1f88aeff600ef2bedfba99e305f4ce9ee48d09c77aef4682400928d3b`
- `sample/server/app.mjs`: `707004c792d0b1a75ecaa0b573210f75459e8be76905b416c452244921763517`
- `sample/server/available-slots.mjs`: `794e0353d47039d3f080066a44405bb256e813a4eee5d67ffb1ec1c95a4eef2e`
- `sample/server/people.mjs`: `381b1f745f3e5fdc73bf00bd5f3a326cd2253c4b3b8a30e20e933a37d08c718f`
- `sample/client/api-client.js`: `2ff660291e36dbcac4820f371748a6fb3400f3871742761c8bd05f9c048034f3`
- `sample/client/public-trial-submit.js`: `698edcfa42fc8eb57469a11ce64e040366a51ae039b7b54171d34956384a3fdd`

正式 policy null 仍保留。獨立測試、Root GUI、Root full checks、啟用與最終完整 Goal 是不同證據，不以這21案混稱全部完成。

## 最後指定七張畫面：獨立截圖審查

本節只使用 `view_image` 目視 Root 提供的實際截圖，**驗收者沒有親自操作本輪瀏覽器／GUI**，也沒有重跑同版21案、full suite 或 build；因此只判斷畫面可見部分，不把截圖當成捲動、鍵盤、API權限或持久化的獨立動態證據。

已逐張查看：

- `/tmp/beamal-trial-gui/public-review-390-zh.png`：課程／日期／時間／老師摘要、申請未提交狀態、已填個人資料清晰；左右留白及 header／footer 分界正常，修改／關閉／提交三個操作未互相覆蓋。較下方欄位超出目前截圖視窗，屬中間捲動區；單張畫面不能證明所有下方內容皆可捲到。
- `public-received-390-zh.png`：只顯示「已收到申請，將會聯絡跟進」，未假稱已確認報名／Paid；相同課程／時段，申請編號完整換行而未溢出卡片，返回課表按鈕可見。成功態中段留白較多但沒有遮擋或操作矛盾，不另擴功能。
- `teacher-reject-review-390-en.png`：Pending 狀態與正在核對 Reject 並無矛盾，釋放 Trial reserved place 的結果解釋清楚；Back／Reject request 可見且分工明確，標題與X沒有貼邊或被裁切。
- `teacher-rejected-390-en.png`：同一姓名／申請編號／課程／時段顯示 Rejected；未見仍可 Reject 的主操作，Back to applications／Close 清楚。外框焦點環完整，不是文字裁切。
- `teacher-workspace-after-restart-1280-en.png`：Trial follow-up(1) 置於工作台內，To-do(1) 與可見一筆待處理人一致，旁側今日課堂是不同用途；沒有同時顯示「Tasks unavailable」的矛盾。待處理姓名與已拒絕範例是不同學生，不因兩圖總數不同推定資料錯誤。版面左右留白及主操作正常。
- `admin-person-trial-record-1280-en.png`：可見相同 Applicant 的 Rejected 歷史與 View request／Close。**這張初版有實際排版發現**：彈窗內只有一張卡片卻只佔左半邊，右半邊大片空白，導致 reference 分成三行、60 minutes 拆行；不屬資料或權限錯誤，但影響 client sample 的整齊易讀。
- `student-own-profile-after-trial-1280-en.png`：可見自己的 Chloe profile、DOB／school／level及既有課堂，沒有把新 Applicant 的資料顯示成此學生；版面對齊、留白、卡片及 View My classes 未見遮擋。此截圖不等於獨立證明整個 Student API 私隱。

### 初版排版發現的修復狀態

Root 已接受 Admin person-trial-list 的實際截圖發現，僅在 `.trial-request-dialog .trial-requests-list` 使用單欄滿寬，沒有要求擴全頁卡片排版或業務功能。Root 正重新 build／reload 精確個人申請清單並重拍同名截圖。

**截至本節寫入時，驗收者尚未讀取修復後新圖，故不能先寫視覺 GREEN。** 其餘六圖未見本切片畫面阻擋；新圖將另追加實際目視結果。最終提交政策 null 及前文21案的證據界線仍保留。

### 修復後 Admin 個人試課記錄新圖：已目視確認

已重新用 `view_image` 開啟 Root 重拍的 `/tmp/beamal-trial-gui/admin-person-trial-record-1280-en.png`。新圖中單張記錄卡片使用彈窗可用內容寬度，右側不再留半欄；reference、日期／時間／60 minutes 均可一行讀完。姓名、Rejected 標記、View request、X 與 Close 都有正常留白，沒有相互遮擋或裁切。**原窄卡排版 finding 已目視確認修復，本次指定七圖沒有剩餘視覺阻擋。**

這仍是獨立截圖審查，不是驗收者親自操作 GUI；沒有重跑已通過的21案／full／build，也沒有修改 repo／Git／DB。Root 另回報最後 CSS 後 full1733／1733、54.01秒及 build6.31秒；此為 Root 的執行證據，不計作本驗收者獨立重跑。JS 未變的前述21案及正式 policy null 邊界保留，不因此宣稱功能已對正式訪客開放或全 Goal 完成。
