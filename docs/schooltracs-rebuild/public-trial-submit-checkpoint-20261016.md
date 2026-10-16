# 公開試課申請與老師跟進：2026-10-16 檢查點

本片屬課程／時間表主流程，不代表兩個模組或整個 Goal 已完成。其他模組維持擱置。本片沒有修改 Goal、AGENTS.md、正式發佈或推送 GitHub。

## 已接通的結果

- 公開課程 → 精確日期／時段 → 空白申請表 → 核對 → 真實提交。建立獨立 Applicant，佔用既有 Trial 配額，不自動建立帳戶、轉成 Student、付款或正式入班。
- 申請回條只回傳收件編號。同一次提交遇到連線中斷／已提交但回應無法讀取，使用原操作識別重試；不重複建人或佔位。改內容不能冒用舊識別。最後名額競爭受保護。
- Admin／目前負責老師可經課程入口查看真實申請，老師首頁及 To-do 顯示同一來源的待跟進數量。申請詳情、聯絡資料、時段及歷史綁定精確紀錄。
- Reject 需先核對；取消不寫入。成功後只釋放該申請的 Trial 預留，保留 Applicant、申請與事件歷史。過時版本、撤權、來源改動與晚到回應不誤覆蓋結果。
- Applicant 的 Trial records 依人物 ID 篩選；不借用同名學生或另一人的紀錄。學生帳戶不能讀取私有申請清單或其他人的聯絡資料。
- 背景更新不重建無變更畫面、關閉帳戶選單或打斷輸入；詳情由頂部開始，返回保留清單分頁、捲動及原按鈕焦點。

## 正式開放仍待必填規則確認

原稿列出欄位但未標明最低必填組合，使用者尚未回答已提出的三選一問題。正式與本機預設 `trialFormPolicy:null`：可填寫及核對，新的正式 Submit 停用；不以測試設定冒充批准。支援的三個明確選項是姓名＋生日＋WhatsApp、姓名＋WhatsApp、姓名＋WhatsApp 或 Email。

GUI 驗收僅在獨立測試庫暫用第一個選項建立兩筆試課，完成後已恢復 null 並重啟。已提交的原回條仍可安全讀回，不因關閉新申請而重新佔位。

## 同版驗收

最後 CSS 修正後：`npm test --prefix sample` **1733／1733，0 fail／skip**；`npm run build --prefix sample` **通過，6.31 秒**。現有大檔案體積警告仍存在，不宣稱整站效能驗收完成。

獨立驗收者另跑 **21／21**：8 個真 HTTP／實際 SDK，13 個讀取完整實際 src 的控制流程案例。涵蓋最後位競爭、交易失敗完整回復、服務重啟、同 key 重試、角色撤權、分段 HTTP body 後重核權限、晚到 GET、返回焦點、背景更新及未知／錯誤／恢復。控制流程模型不是瀏覽器；GUI 另外實跑。

實際瀏覽器：390 中文公開表／收件結果、768 英文申請清單、390 英文拒絕核對／成功歷史、1280 管理員與老師、學生隔離。兩個測試申請中一個已拒絕，一個 Pending；服務重啟後老師真待辦為 1；公開原時段恢復 1 個 Trial 名額。Chloe 仍只有自己的兩課／六堂，沒有被加上新申請人。過程捕捉的瀏覽器 error／warn 清單為空，不作全站無錯誤保證。

獨立截圖審查發現申請紀錄彈窗卡片只佔半寬，已限定該彈窗改為單欄；全套檢查隨 CSS 改動重新通過。沒有重設示例資料來掩蓋錯誤。

## 資料保存

原使用者資料庫：新增三個空申請表；原有 44 表的內容雜湊與數量逐表不變，完整性檢查 ok。沒有重設／重新產生示例人物。

獨立 GUI 庫：既有 People 300 → 302（新增兩個 Applicant，原 300 學生不變）；兩個 Trial 預留為 held 1／released 1；兩個申請為 Pending 1／Rejected 1；三個事件、兩張公開回條。只有人物及其稽核、Trial 預留、操作回條和登入 session 表有預期變動；課程、排課、正式報讀、學生課節、付款、老師關聯等原資料不變。比較輸出不含私人欄位。

## 來源與限制

採用來源優先次序及原稿 p1／p5／p6、Notion 本機快照之具體對照見 [source contract](evidence/public-trial-submit-20261016/source-contract.md)。本片沒有取得新的 SchoolTracs 動態操作證據，不宣稱與其所有功能完全一致。

仍未完成的必要課務包括試課後結果跟進／手動 Convert、個別學生課次 Pending Confirmation 真保存及續辦、Absent 真跟進待辦、合資格調補課最終確認與兩端同步、分鐘／組合課包及部分生效／額度規則。它們不是 minor；需要政策的部分逐項確認，其餘繼續製作。

## 證據

- [完整測試](evidence/public-trial-submit-20261016/full-test.log)、[建置](evidence/public-trial-submit-20261016/build.log)
- [獨立驗收](evidence/public-trial-submit-20261016/independent-review.md)、[HTTP 結果](evidence/public-trial-submit-20261016/independent-http.log)、[完整 src 結果](evidence/public-trial-submit-20261016/independent-fullsrc.log)
- [原資料檢查](evidence/public-trial-submit-20261016/original-data-migration.json)、[隔離庫檢查](evidence/public-trial-submit-20261016/isolated-data-check.json)
- [手機收件](evidence/public-trial-submit-20261016/public-received-390-zh.png)、[手機拒絕](evidence/public-trial-submit-20261016/teacher-rejected-390-en.png)、[老師重啟後](evidence/public-trial-submit-20261016/teacher-workspace-after-restart-1280-en.png)、[個人紀錄](evidence/public-trial-submit-20261016/admin-person-trial-record-1280-en.png)、[學生隔離](evidence/public-trial-submit-20261016/student-own-profile-after-trial-1280-en.png)
