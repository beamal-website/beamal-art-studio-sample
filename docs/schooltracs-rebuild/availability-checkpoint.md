# Overall Available Slots：限定實作及驗收檢查點

更新：2026-10-15。首次468項完整結果及build之後，實際畫面另發現導航／保存後重畫問題；修正後中途445／469失敗保留，最後已真正重跑469／469通過。最後依序build亦成功（5.47秒、exit0）；真正畫面的限定證據已補在下方。依 [本片規格](availability-spec.md) 及 Notion §3.1／§13 推進課程＋時間表，保留 Beamal 風格、中英文與手機版。這是共用時段管理與真正匿名公開投影的切片，不是 Trial 申請、正式報名或整套 SchoolTracs／111 項要求完成。

本檔Slot指可約時段，ID是固定識別碼，ACK是服務確認已保存的回覆；version用來拒絕舊表單覆蓋新修改，revision用來確認某範圍資料是否有變。HTTP是向真正服務讀寫，SDK是網站呼叫接口的共用程式；純UI／模擬介面測試與真正瀏覽器結果分開。

## 已落地的路徑及界限

Admin 從 Timetable／Course Details 新增或修改 Overall Available Slot → 同一固定 Slot ID 在內部課表與課程頁顯示 → 真正匿名 public API 讀取允許公開的同一 Slot → 修改 Public Visibility／公開設定後，公開投影更新而內部內容保留。

- 獨立時段引用正式課程、老師及課室 ID；linked 時段引用排課系列 ID＋不可變 sequence，日期／時間／老師／課室從該堂實際資料投影，不建立可漂移的公開副本。來源取消、刪除、無老師或不可用時保留 Slot ID，內部說明不可用，不公開為可約時段。
- Total／Trial／Rescheduling 三個配置值分開保存，兩類資格獨立。新 Slot 尚無預約，兩類使用數為已知 0；Total 合算未知保持 `null`，linked 的正式班內已入班人數仍為 `null`，不把未知人數填成 0。
- 公開預設 Trial；hide 不公開，show 可明確公開其他類型。預設隱藏 Full Trial，設定可顯示 Full。普通 Rescheduling 預設不展示，未獲公開展示條件時連該類配額欄位也不回傳。公共設定只改展示，不改內部時間、資格或容量。
- 公開固定連續 **7 天**，香港當日為預設開始日，可選開始日及前後七日切換；未完成最大 30 天的可配置範圍，不能拿內部 1–14 天替代。
- Teacher 只讀本人／明確授權 Slot，不由可讀某課推導為可讀該課全部 Slot；內部備註及排除 Student ID 只供 Admin。普通老師可設定的寫入／Public 管理授權仍未實作。排除人物可由 Admin API 保存／保留，尚未有最終預約校驗。
- shared 公開課程頁只讀白名單 API，不用 private catalog、舊示範班別／費用或本機學生資料補內容。沒有正式公開介紹、適齡、圖片／完整價格發布資料時不自行生成；原 Beamal 素材保留。
- shared Join／Confirmation／Payment／Payment-success 不再執行舊示範報名與 Paid 流程。畫面明示 Trial 申請尚未開放，不以 Admin 新增 Slot 或 Applicant 冒充訪客申請。

## 自動驗證證據

以下按各測試檔頂層案例計算；同一案例可含多身份、返回原頁及多種結果。指定套件不是實際畫面或整頁驗收。

| 證據 | 精確結果與範圍 |
|---|---|
| 新增主流程 | **15／15**，`flows.test.mjs`：匿名課程／同 ID 七日 Slot、封閉舊 Join／Paid、保存 ACK 後 GET 失敗、衝突／固定 key／草稿、設定版本 0、23:15 時段、舊詳情錯誤、新增／設定離頁及 A→B→A、private/public unchanged 保 DOM／焦點、較新版本、Back 舊 ACK、401／403 清私人資料、公開日期競態、linked 真單堂、Teacher 唯讀。 |
| 新增 SDK | **3／3**，`api-client.test.mjs`：編碼日期／課程／Slot ID、開表版本及重試 key、公開設定只送兩個 boolean＋version 0、無登入的 public 專用讀取。 |
| 純畫面模組 | **15／15**，`availability-ui.test.mjs`：真欄位、linked 不可變來源、三配置／空值、未知人數、輸出編碼、loading／error／Full、固定七日與 Rescheduling 展示標記；不是瀏覽器版面證據。 |
| 真 HTTP 新服務 | **11／11**，`server/tests/available-slots.test.mjs`：Admin CRUD／固定 ID、CSRF／Origin／角色、Teacher 細範圍／撤權、匿名白名單、Visibility／Full、linked 移日／取消／Undo、held fixture 保護、交易撤回／重試、衝突及隔離資料庫重啟。 |
| 既有 Teacher 範圍回歸 | **9／9**，`server/tests/teacher-access.test.mjs`；與新 Slot 服務合跑 **20／20，8.22 秒**。這九條是既有回歸，不加作本輪新增九項。 |
| 獨立前端全檔 | **260／260，11.3006 秒，exit 0**（flows 239＋SDK 21），`/tmp/beamal-availability-front-final.log`；此為最後兩項畫面修正前的全檔結果。隨後新增1條People sidebar導航回歸、擴充既有ACK案例，兩條指定回歸2／2通過；最後全檔結果261／261另列下行。兩測試檔語法檢查亦通過。 |
| Root 完整測試 | **468／468，69.7004 秒，exit 0，0 fail／cancel／skip／todo**；`/tmp/beamal-availability-full-test.log`。這是後續People sidebar／changed paint修正前的首次完整結果，不能當作最新runtime已全套重驗；最後469／469結果另列下行。前次People424／424保留。 |
| 後續獨立前端全檔 | **261／261，8.3393秒，exit0**（flows240＋SDK21），`/tmp/beamal-availability-front-after-navigation-final.log`；限定畫面保存焦點／捲動只在Availability頁後，舊catalog／filter／Teacher日期回歸一同通過。保留全部舊斷言；此結果不是完整npm／build通過。 |
| 修正後中途全套失敗 | **445／469，24 fail**；`/tmp/beamal-availability-final-test.log`。新全頁重畫讀取觸及不需要該功能的既有DOM測試介面；已限定在Availability頁恢復grid位置。沒有移除或改弱舊斷言，隨後261前端及469整套已重跑通過。本行保留為歷史失敗，不作目前狀態。 |
| 最後Root完整測試 | **469／469，56.8668秒，exit0，0 fail／cancel／skip／todo**；`/tmp/beamal-availability-final-green-test.log`。這是最後導航／changed paint修正後的完整結果，取代先前結果作目前測試狀態，不刪歷史失敗。 |
| 隨後依序 build | **最後469／469之後依序build成功，5.47秒、exit0**，`/tmp/beamal-availability-final-build.log`；首次3.90秒保留為先前结果，不作目前來源的證據。 |
| 真正畫面 | **下節限定證據已完成**：Admin建立／讀改、匿名公開同ID、Teacher唯讀、public390中英文、390管理表單、Cancel／Escape／Back、公開Hide及最新側邊導航。linked／Full fixture畫面與300 active不宣稱已驗。 |

HTTP 的 Full／held reservation 使用隔離內部 fixture；沒有透過訪客 Submit 建立真正 TrialRequest，不能聲稱搶位、Reject 釋位、Absent 不釋位或申請通知已完成。後續真正畫面若發現其他既有缺陷，須另記修正及新的最後完整結果，不把以上凍結來源結果冒作後續修改後仍已驗。

## 獨立審查後修正

三項先重現失敗、修正後通過的真實介面問題：

1. A 詳情讀取未完成，關閉後已開 B；A 晚到的普通 503 錯誤不能把 B 關掉。當前身份失效／拒絕授權仍須清私人資料。
2. 設定 GET 或新增表單資源 GET 未完成，使用者已離頁；舊回覆不能彈視窗。即使 A→B→A 回到同一路徑，先前開視窗意圖仍作廢。
3. private／public 的 unchanged 回覆不再每次替換整頁，保留時段按鈕焦點；有真變更、錯誤解除或尚未畫出的資料才更新。

保存以服務 ACK 為準。若緊接列表 GET 503，顯示錯誤並在目前日期／課程範圍保留同 ID 已保存記錄；不冒稱整份清單成功載入、不開回新增讓使用者重建。延遲 ACK v2 不能覆蓋背景已讀 v3。23:15 Available Slot 可延伸課表可見範圍，但普通課原有 19:45 最後一列不因本片改變；兩條既有回歸已重新通過。

### 隨後實際畫面發現及指定修正

Root本機操作發現Admin在People Profile點側邊Timetable仍停留人物頁；已新增genuine RED，修正後同一案例核對Timetable／Courses／Students三入口，均離開`/account/people/:id`回`/account`並顯示正確模組。

另一畫面問題是保存後首個真正有變更的列表重讀令saved Slot按鈕焦點與課表捲動位置消失，和unchanged不應重畫是不同情況。Root修正後，原ACK／503案例擴充驗同ID、焦點及左右／上下捲動值保留。這條是在修正已落地後補強，不把DOM stub調整造成的初始失敗冒作產品RED。

兩條指定回歸**2／2通過**，`/tmp/beamal-availability-final-ui-navigation-green.log`；新增People導航案例1條，隨後獨立全檔已真正重跑261／261（flows240＋SDK21），8.3393秒、exit0。其後Root已真正重跑完整469／469，見表；最新build已在469整套之後另行成功，见表；不由此指定前端套件推定建置。

## Root真正本機畫面：已驗與未驗分開

使用合成測試Course `d46852df-29b3-4991-a62d-d212990e039e` 及Slot `84b97aeb-60c6-4477-acc6-cce8822181c3`，不是正式營運資料：

- Admin真正建立16Oct 16:30、60分鐘、Total／Trial／Rescheduling配置8／2／3、Teacher B／Room A；重開詳情可見內部remark，未知Total使用數顯「—」。
- Admin改17:00＋hide，再改回default，保留同Slot ID、版本至v3；內部列表仍17:00。這是Public Visibility更改，不是刪除／還原時段。最後再hide／default一次至v5：無cookie public HTTP回404；內部同ID仍保留17:00，手機公共頁顯示找不到已公開課程及0 Slot；恢復default後公共頁自動重讀同ID17:00。
- Chrome真正登出後，匿名頁讀到原16:30與同ID，沒有remark。其後Chrome控制連線中斷；最新17:00／同ID／無remark由真正無cookie HTTP確認，且內建瀏覽器公開頁亦讀到17:00。沒有聲稱中斷後Chrome本身已重做所有步驟。
- Admin真正保存全域Show Rescheduling，內建瀏覽器公開17:00顯Trial剩餘2／Rescheduling剩餘3；這是無Reservation新時段的展示，不是訪客提交成功。
- 真正Teacher帳戶讀到同ID，只讀，沒有Edit／Add或內部remark。
- 內建瀏覽器public390中英文均無頁面橫溢出；Next7到22Oct不帶舊Slot，Previous可回。英文Admin Edit於390×844的dialog左右8／382、底835、Save底821，底部操作位於視窗內。中文Admin390表單亦已開啟並保存截圖；全頁寬390無橫溢出。Tab從Save回到同dialog的Close。英文改23:15後Escape／Cancel，重開仍17:00、v3；最後中文草稿23:15時瀏覽器Back回公開詳情，dialog0且時間仍17:00，沒有保存草稿。

最後新build載入後，Admin從既有People Profile實際點時間表，URL返回`/account`並顯示時間表；兩分頁重開同Slot與public變更亦已核對。公開日期Next7到22Oct時沒有舊Slot；Back及恢復公開後仍由同正式資料讀取。沒有本輪linked Slot完整畫面、Full fixture畫面或300 active端到端負載證據；全套Goal與整頁判定仍未完成。

## 仍屬主要要求的未完成部分

- 真訪客 Trial 表格／Submit、立即佔額、Reject 釋額、Trial 狀態／跟進／通知與持久 To-do。
- Total 是否包含正式 Class 學生、Reservation 合算／扣額公式；Enrollment／Student Session、調課資格與排除學生的最終預約校驗。
- 直接／歷史 Student 建立及人工 Convert 前置規則、Family／Login／激活、Request／Confirm Payment／Convert 三動作與課包／剩餘堂數。
- Teacher 的 Slot 編輯／Public 管理動作授權、公開 7–30 天配置與最短天數、完整 Course 資訊／價格發布。
- 訂單、測試 FPS 人工核實、PDF Receipt、Coupon、測試通知、Attendance、Leave／Clock／Payroll 等仍按 111 項覆蓋清單推進，沒有改成 minor。

Total 公式、公開 Trial 必填／選填與直接 Student／Convert 等具體問題仍等使用者答覆。未回答的相依動作保持未開放，不以等待時間推定批准；**不把整個 Goal 標為 blocked**，可獨立進行的已確認工作仍繼續。完整 Goal、課程＋時間表整頁與 **4 老師／300 active 學生／6 課／3–18 歲**本機大檢查仍未完成；先前 300 Applicant HTTP 分頁不是此規模驗收。本輪沒有雲部署、SEO、iOS、外部消息或未知 Git 提交／推送成果聲明。

截圖保存在本機：`/tmp/beamal-availability-admin-detail.png`、`/tmp/beamal-availability-public-390-final.png`、`/tmp/beamal-availability-editor-390-en.png`、`/tmp/beamal-availability-editor-390-zh-final.png`；不是外部或正式營運資料。沒有Linked／Full fixture實際畫面或300 active壓力驗收，這些界限不變。
