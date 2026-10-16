# Pending Confirmation — 獨立實際 HTTP／SDK／完整 src 驗收

2026-10-16。此報告只覆本片「指定學生課次 Pending 真保存 → 唯一持久待辦 → 同課次續辦與返回」。沒有把它稱為目標補堂確認、扣額／釋位、家長申請審批、完整 To-do 系統或整個 Goal 完成。

## 結論

當前固定 **17／17 GREEN**：

- `/tmp/beamal-pending-independent-http-20261016.mjs`：**7／7**（6個真 HTTP 隔離服務案例＋1個 actual SDK 控制回覆案例），exit0，5.456秒。紀錄 `/tmp/beamal-pending-independent-http-20261016-final.log`。
- `/tmp/beamal-pending-independent-host-20261016.mjs`：**10／10**，exit0，0.496秒。紀錄 `/tmp/beamal-pending-independent-host-20261016-final.log`。

獨立驗收找到2個真正的整合 RED，Root 修後保留原斷言複驗通過，詳後文。現在無新增阻擋發現。

只寫 `/tmp` 測試／報告；真 HTTP 的每案使用新 `/tmp/beamal-pending-independent-*` fixture DB／loopback服務，各案已關閉並清理。沒有接觸原用戶 DB／既有服務、改 repo、Git、Goal、瀏覽器，沒有執行 full suite／build。Root 的 GUI 或全套結果不計入以上17案。

## 來源與正式契約

已讀 `/tmp/beamal-pending-source-implementation-map-20261016.md`；原始來源盤點 `/tmp/beamal-pending-independent-contract-20261016.md`。

- 本機 Notion `docs/schooltracs-rebuild/notion-requirements-source.md:112–118`、EX07 :347–352：精確人／原課次、Pending不選／不預佔／不釋位、唯一可續辦老師待辦。
- 現行 Goal `docs/schooltracs-rebuild/ULTIMATE-GOAL-PROMPT.md:258–274`：出席與Pending獨立、同課題／目標政策待定、真任務及精確回到記錄；不是把未決目標確認規則拿來阻擋已確認Pending。
- 實際服務：GET `/api/student-sessions/:id/arrangement` → `{arrangement}`；PATCH `/:id/pending-arrangement` 僅 `{version,sessionVersion,sourceVersion}`；GET `/api/pending-arrangements` 有精確 records／total／page／pageSize／revision。
- `version0/status:null` 是授權來源已查知無記錄；attendance sessionVersion與arrangement version獨立；不同key stale version409，已Pending以目前三版本保存為無新增transition／audit的no-op。此為這版已固定的工程契約，不自行推導取消／重開／完成政策。

## 真 HTTP／資料與權限（獨立7案）

1. **第二個同名學生、固定第一課次。** 隔離庫經真正建立order→send→家長confirm→Admin確認付款得到5個Paid StudentSessions。保存目標同名學生B的該堂，只有一個 arrangement／一次audit／receipt與唯一work row；全庫其餘business tables逐row深比較不變。滿班原3／3不變；其他同名者與同一學生另一堂不變，attendance／sessionVersion／remark不動。相同key同body回原ACK，改body同key409。Student主家庭看到精確一堂safe `{status:'pending',version:1}`，其餘自家堂known empty；另一家庭沒有該課，沒有actor／內部備註等。服務關閉重啟後同Pending／task及receipt保存，不新增audit。
2. **方法／版本／權限。** Student／另一家庭／匿名／未負責老師不能寫；forged targetSlot／status／attendance／studentId 400，三版本錯誤409，duplicate／unsupported query400，不支持method405，缺CSRF403；零Pending row。撤本人teacher link但保Course read grant後，名冊可讀、`canSetPending:false`，exact管理詳情／寫入403，私人work無該任務。
3. **調派與body-await撤權。** Pending後將source改到另一老師及15:00；舊老師work消失、新老師同session新時間，舊key replay仍403。以真分段HTTP PATCH送headers／未完JSON，收到server request事件、確認已達body await後撤新老師link，再完成JSON：403，原唯一row／audit保持。
4. **原子失敗及競爭。** 新隔離庫audit trigger故意失敗，HTTP500不洩SQL／probe；Pending、audit、receipt均rollback，所有原business rows不變。移除trigger後並行Admin／Teacher以同initialversion保存，只1個200／1個409，一row／audit；當前版本no-op不多生transition或改timestamp。
5. **Actual SDK。** exact含空格／中文sessionID正確encode，PATCH原三欄、原key、same-origin、CSRF保持。寫入等待期間session accessRevision改動，晚ACK丟棄為AUTH_SUPERSEDED，沒有採用私人回覆。這案採fetch控制回覆，不冒稱與真HTTP串在同一次測試。
6. **非空舊holds及滿班。** baseline含同正式課existing Trial held1與rescheduling held1；保存Pending前後全business rows不變，兩種reserved均保持1、正式滿班仍3人，沒有新增target hold。這些只在新fixture設為既有資料，沒有重驗Trial功能或改既有使用者資料。
7. **unpaid與取消後歷史。** 在新fixture建立未付order與相應invalid session，不能取作Pending或保存（404、無row/audit）。真正Paid目標保存後取消原課，Admin仍能讀到同一version1 Pending／work，`sourceAvailable:false/canSetPending:false`，不可再保存409；沒有為清待辦自動刪資料、變confirmed或動付款。

## 完整實際 src／controller／resolver（獨立10案）

環境 `/tmp/beamal-pending-current-fullsrc-harness.mjs` 取正式 flows 的一般 VM／事件適配，停止註冊製作者測試，再讀**實際完整 src.js**及實際 `createInterfacePreview`。沒有以只回true的 openSharedLesson stub 當續辦完成，亦沒有另寫一套Pending controller作oracle。HTTP source方法在這部分由可控fixture回覆，與前段真HTTP證據分開；VM／控制項模型不等於真瀏覽器。

1. **首頁外月窗續辦。** 真global action／`openPendingArrangementFromWork` → exact GET／roster →真 `resolveSharedLessonForUi`／opaque return ticket →真controller arrange。目標是目前calendar外2027-04-23、sequence19、16:30／75min、同名第二人；畫面只有正確人課，不借首筆。沒有改目前timetableDate／courseMonth。Cancel回同home task／scroll[9,412]，沒有order writes。
2. **晚來源。** 初始GET等待時離頁／換accessRevision、或GET回另一student而roster不吻合，都不開舊私對話或留下return context。
3. **名冊保存／返回。** 真course第二堂、同名第二人，Pending Review→Save只送canonical `{version0,sessionVersion2,sourceVersion1}`；成功確有 `#slw-pending-saved`。attendance仍unmarked、version2、另一學生全不變；Continue可回arrange，forged final-confirm不額外寫，Close回原course／October／students tab及原selection。
4. **lostACK＋讀錯後重試。** 第一次服務已記Pending但200JSON不可讀；roster再503且cache真的students[]。沒有假成功；第二次原payload／key送達、精確ACK後可顯saved panel；cache仍[]，沒有用ACK捏造attendance row。這就是第一個整合真RED，詳後文。
5. **busy／身份。** Pending保存等待中Close／double submit均不生第二次write或錯閉；換accessRevision清privatecontext，晚ACK不復活成功。
6. **錯ACK與source drift。** 不同student／sequence的ACK，或等待時實際sourceVersion改動，均不顯saved、不套到名冊。
7. **舊work GET晚到。** 保存前讀到的empty snapshot在Save ACK後才回來，不能採為current ready/total0；不強迫client手動造總數，允許unknown／fresh read。第二個真RED修後通過。
8. **真重畫後task焦點。** 舊opener已移除時，以stable sessionID在新task buttons中找回精確task，不能選同名另一task；保持原scroll。
9. **原生submit dispatch。** 由實際form id／FormData submit事件路徑送出Pending，植入的forged student/session/version/attendance/targetSlot欄都不能改canonicalpayload或出席，仍只有一個Pending save／saved panel。最初測試未等global事件內部非await回呼完成，得到Saving畫面；只補microtask settle、不改預期，保留 `/tmp/beamal-pending-independent-host-20261016-native-no-wait.log`，不當產品RED。
10. **Root GUI疑點的窄碼驗證。** Work task→Cancel後isOpen false、sharedLessonReturn null、modal空；真global logout action確實呼叫client.logout一次，清authUser並到`/login`，沒有overlay擋截。此模型未重現Root看到的IAB菜單／click timeout，不據此斷言IAB或真原生選單必定正常，也沒有操作GUI繞過工具。

## 兩個真RED、修復及原斷言複驗

### A. 讀取錯誤清空名冊後，成功receipt仍被錯擋

初版 `/tmp/beamal-pending-independent-host-20261016-initial.log` 5pass／1fail，第4案。第一次已保存但ACK壞掉→`refreshLessonStudents` 503把cache students清[]→同key重試確送達成功ACK，`saveSharedPendingForUi` 卻因 `matches.length!==1` 永遠丟棄，畫面一直unconfirmed。Root既有只stub resolver.error而保留rows的測試沒有碰到實際這條鏈。

Root修成分開「ready而exactrow已不存在」與「讀取failed／unknown」：前者409；後者以opaque ticket／既有exactperson／source／version核ACK，無完整row就不merge或新建假attendance row，成功receipt panel仍可如實顯示。第4案原saved斷言不改，另加兩次cache students.length仍0的保護，最終通過。

### B. 儲存前的empty work read蓋掉已建立待辦

`/tmp/beamal-pending-independent-oldwork-20261016-red.log` 第7案先RED。ACK後原code只清revision，refresh重用同identity舊promise，舊`records[]/total0`晚到被當ready current，剛保存任務短暫顯示沒有。

Root ACK後失效舊pendingWorkRead/job，work cache先unknown並fresh read，不手動假造總數。原第7斷言不改通過，既有Trial來源不受此測試／修復混用。

## 最後版本

- `sample/src.js`: `29576547d3142e9a0cdc174fcbd7db9976ce7aa9eb60fbc7e94aeda3dbd19c0f`
- `sample/client/interface-preview.js`: `bb4894d1192d1173b507a93e9e5b34f74dd539bd80346c5e6ccda1c5aab4e238`
- `sample/client/shared-lesson-workflow-ui.js`: `9b692d89357a79e0923258c421fa93aa495f9b91df2b533edd8500865f0909e3`
- `sample/client/shared-lesson-context.js`: `85e317c4da5e671112e8db981875a54dcff27cdb57f2cc0d78c9c1f4698f44af`
- `sample/server/enrollment-orders.mjs`: `a7943d5753f2a2c81d2a5f201e7ac8e908d745a0489d7d04db9f435d153413c7`
- `sample/server/app.mjs`: `5750752c6f99f3fc086ff1d80e7d78aac35660ec6d640c70ecbcc1cdfebc6eee`
- `sample/client/api-client.js`: `339f83b54f50c2397c157f470d7340ce5621a12546f5e6591d0310d04f0999a5`

## 限制／未聲稱

沒有親自GUI、手機輸入、讀屏或真正瀏覽器focus/caret驗收；task回原scroll／focus及logout是完整程式模型證據。未做不同OS process同SQLite競爭或300人負載，並行案例是兩個真HTTP。沒有重跑整個舊Attendance／Trial suite，只在本片逐row證明原業務不變與preserve関係；全回歸由Root安排。

沒有開放target確認／移課／扣額／原目標座位轉移／parent request／自動通知；既有合資格slots未知仍如實未知。Pending任務持久不等於完整個人排序／Absent跟進／整個To-do系統已完成；沒有自定cancel/reopen/expiry政策。這些未決不阻擋本片已確認Pending保存與續辦，亦不把它們寫成minor或已完成。

## 最後截圖獨立審查（2026-10-16）

本節只以 `view_image` 檢視 Root 重拍的五張圖片，**不是本人操作 GUI**；沒有重跑17案、全套測試或build，也沒有修改repo／DB／服務／Git。390圖片呈正常390×844直向畫面，學生calendar呈正常768×1024；未見之前tiny compositor截圖問題。

- `/tmp/beamal-pending-gui/pending-review-390-en.png`：Chloe／水彩探索／2026-10-17 10:00、60分鐘的context清楚。Pending核對內容與「Changes have not been saved」一致，Back to edit／Save在固定footer完整可見；正文沒有貼邊、遮擋或裁切。
- `/tmp/beamal-pending-gui/pending-saved-390-en.png`：同一學生同一課次，明確顯示Pending Confirmation saved，並說明替代時段尚未選定，未冒稱已完成調課。Close／Continue viewing times按鈕完整可見，後者兩行自然換行，沒有互相重疊。
- `/tmp/beamal-pending-gui/pending-resume-390-zh.png`：畫面是另一個已知Pending課次（Chloe／創意繪畫／2026-10-16 13:00），並非前兩圖的水彩堂。日期欄、補堂時段暫未提供提示、此課次已Pending的說明及停用Pending選項均可讀，取消／核對footer完整。截圖只證顯示及布局；沒有把可見「核對」當成實際target確認或可移課的證據。
- `/tmp/beamal-pending-gui/student-calendar-768-zh.png`：僅10月16日創意繪畫及17日水彩探索兩個指定課次有「待安排」；23／24／30／31日相同課程未被整期標記。日期、課名、時間及狀態在格內可讀，沒有水平裁切或遮擋。
- `/tmp/beamal-pending-gui/teacher-workspace-390-zh.png`：待辦總數3與待安排課堂2＋試課跟進1一致；兩個Chloe任務以不同日期／課程區分，沒有錯當重複人或整班。頁籤分行及卡片留白正常，主要入口可見，沒有Tasks unavailable等矛盾提示。

**本批五圖未發現阻擋交付的視覺問題。** 不據截圖推斷原生點擊／鍵盤／讀屏、重啟持久或真保存必然正常；那些證據分別由前段獨立HTTP／程式模型及Root的GUI操作提供。Root另回報同版1771/1771、0 fail／skip、73.80秒及build9.73秒；這不是本人重跑結果。1280重啟後Teacher圖尚未收到，本節不預先認定通過。

### 補充：重啟後桌面Teacher圖

已以 `view_image` 檢視 `/tmp/beamal-pending-gui/teacher-after-restart-desktop-zh.png`。圖為1280px寬正常桌面長頁畫面，並非tiny／空白／一直載入。左側導航、頂部logo／語言與帳戶入口有正常留白；頁籤及左右兩欄卡片對齊，未見水平裁切、重疊或主要操作被遮擋。待安排課堂2筆分別保留Chloe的水彩探索10月17日10:00及創意繪畫10月16日13:00，試課跟進1筆為另一人；待辦事項(3)與2＋1一致。今日課堂獨立呈現，名冊未載入時明說「學生名單尚未載入」，沒有偽造空名冊。

**本張補圖沒有新增視覺阻擋問題。** 此結論僅屬截圖審查；1280×720 viewport／沒有DOM水平overflow、兩邊服務已重啟、fresh分頁普通Teacher真登入，以及original／isolated逐表資料對比均為Root另行驗證與回報，不能從一張靜態圖獨立證明。沒有操作GUI、修改資料或重跑任何測試／build。
