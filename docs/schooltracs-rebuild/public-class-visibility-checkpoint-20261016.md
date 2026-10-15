# 公開課堂與試課顯示 — 2026-10-16

## 對應要求與本片結果

依 Ultimate Goal §2.2(2)、§8.2 及原稿 p.4：公開常規課堂、Full 資訊和新客用途不能被 Trial 的附加篩選取代。原稿 p.2 的老師顏色、p.4 的課程圖例，以及 Class／Trial 的滿額狀態是不同資料。

已發布的 linked Slot 現在只帶出對應正式課次的 Class Available／Full／待確認，以及有效歷史課型快照中的名稱／種類。Standalone 不冒認正式班；未設定課型不猜 Regular。匿名與 Admin 管理預覽共用 All／Class／Trial／Rescheduling 篩選，改篩選不寫資料、不另讀私人名冊。

實際畫面發現舊 Full Trial 顯隱會把已發布常規班一起刪去，違反上述要求。已改為：隱藏已滿 Trial 只隱藏它的 quota／入口及 Trial 篩選成員；已發布常規班仍在 All／Class。另有獨立、已啟用且公開的 Rescheduling 用途也保留。Standalone 的 Trial-only Full 仍依原設定隱藏；既有 published 門檻逐字未變，不會自動發布內部排課。

`trialVisible` 為明確 Boolean；前端只有 true 或舊版省略欄位才接受 Trial 顯示，null、字串、數字、物件均不能藉 truthiness 開入口。同一判斷用於篩選、quota、按鈕、開表單及最新來源核對。隱藏後原訪客草稿保留，可取消返回，不能繼續核對。沒有改 Trial／Rescheduling 配額、hold、正式人數或資格算法。

日期、7–30 日範圍、篩選、精確 Slot、捲動及焦點在 Trial Cancel、Manage 返回和更新時保留。讀不到資料、沒有發布、篩選無結果分開呈現；未知班額不填零。正式班 Full 與 Trial 尚餘名額可以分開顯示，不藉此代決最終報名資格。

## 相連問題修正

走查班額表單時，初次名冊回覆可重畫父詳情，蓋走未儲存的 Full 選擇。`refreshLessonStudents` 現在於班額子表單開啟時只更新快取，成功、輪詢變更及失敗均不重畫子表單；Cancel 回最新父名冊。撤權／身份守衛不受此保護阻擋。

## 隱私與資料

- 匿名新增欄位只有 `classAvailability`、`classType:{kind,name}|null`、`trialVisible`；不公開 Class 人數、私人規則／版本／來源 ID、備註、排除學生或老師色。公開 revision 只跟實際公開投影變更；私人同狀態人數、來源版本或老師色變更不外洩。
- 原用戶服務更新前備份；更新後 42 張資料表逐列相同，健康檢查成功。原未發布課程匿名仍為 404，沒有為展示擅自發布。
- 真 GUI 使用隔離資料。為測試 Trial Full，暫放兩個明確隔離 hold fixture，並非真申請／Applicant／Paid；已只按自己的精確 ID 移除。holds 表回原狀，35 張非相關表與實際備份相同；保留正常操作產生的七張來源／設定／audit／idempotent 表變更及歷史。正式時間／課型／顯示開關已還原，最後 linked 為 Class Available、Trial 2、未設定課型。
- 不改原用戶人物、訂單、課節或付款；不將資料庫／私人備份加入 Git。

## 驗證

- 各新增行為先有 RED 再 GREEN：公開 Class／Trial 軸、malformed visibility、正式班保留與 revision 隱私、初次 roster 回覆不蓋表單。既有 class-capacity 用例僅修正與新需求相反的 linked 隱藏斷言，最終手動 Full→Available 回原狀及其他身份／配額斷言保留。
- 獨立製作以外的 UI／host 22／22 通過；另獨立覆核 roster 初次成功／輪詢改變／失敗三情境。沒有重建未保存舊版本來聲稱額外 RED。
- 最後凍結工作區：`npm test --prefix sample` **1362／1362**，71.880 秒，無失敗／取消／跳過；隨後 `npm run build --prefix sample` **3.08 秒**成功。build 保留既有大型 bundle 提示，不宣稱效能完成。
- Root 真瀏覽器：390／768／1280，中英，Class Full＋Trial 2、Class Available＋Trial Full、關閉 Full Trial 後 Class 仍在、Rescheduling 無結果復原、Trial 開／取消；Admin 真設定／單堂課型／班額；手機 Manage→原正式來源→Escape 回同 Slot／日期／14 日／篩選／捲動，Tab／Shift-Tab 留在 modal。沒有完成 Trial Submit。
- 獨立 GUI 代理的瀏覽器只列 Chrome，存取不到指定 IAB；未操作來源或用戶分頁。它另覆核五張現有圖未見阻塞，這是截圖審查，不是它親自走完 GUI。Root 的操作證據與代理的 22 項 host 驗收分列，不能稱全面獨立 GUI 已通過。
- SchoolTracs 本輪在頁面可讀前遇 request-header policy 工具錯誤；沒有新動態 SchoolTracs 觀察，也不是重新看到商店關閉。原 PDF p.1–4 的既有渲染已重新目視；Notion 僅沿用 2026-10-14 快照，不冒稱最新線上內容。

乾淨提交快照（包含本片、不含其他未追蹤的 15 項 Staff group 測試）已 `npm ci` 成功，完整測試 **1347／1347**、62.624 秒、無失敗／取消／跳過；隨後 build **3.34 秒**成功。十份受影響來源／測試與獨立審查當前 SHA256 核對一致。沒有將工作區 1362 項誤報為乾淨提交的數量。

## 畫面證據

同目錄下 `evidence/public-class-20261016/`：

- `01`：1280 英文，Class Full／Trial 2，未設定課型。
- `02`／`03`：390 中英，Class Full／Trial 2，當時精確單堂設 Regular。
- `04-before-fix…`：修正前錯誤證據，**不是驗收結果**。
- `05`／`06`：768 中英，Class Available／Trial Full，顯示 Full Trial 開啟；fixture hold 不是已提交申請。
- `07`／`08`：768／1280 中文，最後修正後關閉 Full Trial，Class 仍保留且不顯示 Trial quota／入口。
- `09`：390 管理預覽，標題／控制／footer；首卡在可捲動內容下方。
- `10`：Manage 關閉返回同 Slot，body 保留原捲動及焦點；不是標題被裁切。
- `11`：新分頁重新讀取已還原隔離資料，1280 中文、Class 篩選、10 月 23 日起 14 日，只見正確正式班、Class Available／Trial 2、未設定課型；整頁無橫向溢出。

## 尚未完成

公開課程顏色／Pre、Baby、A、Interview 圖例的可維護設定仍未做；現有圖例只解釋 Available／Full／待確認，不能代替原稿課程色彩要求。預設 All／Trial 組合與 Class Full 對 Trial 真提交資格、共享座位公式等待來源確認；沒有自訂業務政策。公開 Trial Submit、佔位／Reject、Applicant／Convert 及通知仍待功能階段。完整 Course／Timetable、全 UI、27 項最終情境及整個 Goal 均未完成，不將這些列 minor。
