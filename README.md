# Beamal Art Studio — Management Test System

網站及管理系統在 `sample/`，使用 Vite／原生 JavaScript，保留 Beamal 中英文及手機版。完整重建目標及進度見 [Goal](docs/schooltracs-rebuild/GOAL.md) 與 [進度](docs/schooltracs-rebuild/STATUS.md)。目前正逐頁接入共用服務，不能把尚未接駁的頁面當成已完成。

## 開啟目前的共用課程／收費測試

需要 Node.js **22.13 或更新版本**（本次驗證 22.23.1）。第一次先安裝依賴：

```sh
npm ci --prefix sample
```

分別在兩個終端執行：

```sh
npm run api --prefix sample
```

```sh
npm run dev --prefix sample
```

瀏覽器開啟 `http://localhost:5173/login`。共用服務預設只在本機 `127.0.0.1:5180` 運行；Vite 會把資料要求轉交該服務。若改服務位置，設定 `BEAMAL_API_TARGET`。

管理員、老師、學生各有一個隨機密碼的**虛構測試帳戶**。首次啟動產生的登入資料在 `sample/.data/bootstrap-accounts.json`，只保留在本機，不會提交到 GitHub。重開服務不會更換密碼；`1`／`2` 及空密碼只存在於舊的離線畫面測試，不是共用系統登入方式。

SQLite 共用資料保存在 `sample/.data/beamal.sqlite`。不要把 `.data`、資料庫、帳戶密碼或私人資料加入 Git。正式的跨裝置網址、持久部署、學生／排課／訂單等其他資料接駁，以及付款／通知測試渠道仍在逐步建設。

教材附件的原始檔案保存在資料庫旁的 `sample/.data/beamal.sqlite.attachments/` 私密資料夾；備份及搬移需同時保留資料庫與這個資料夾。檔案不放在網站公開圖片目錄，讀取時仍會核對登入、教材可見及學生授權。每檔最多 50 MB，每份教材最多 20 個附件；選檔先保留草稿，儲存時才上載。停止上載或失敗後可重試，已完成檔案沿用原結果；未加入教材的暫存檔在 24 小時後清理。完整課堂分享、學生報名整合及刪除／還原介面仍待完成。

曾保存到教材的附件移除後，原始檔仍保留作後續歷史／還原用途，目前沒有自動刪除期限；移除後的舊閱讀及下載網址立即失效。PDF 使用網站內建閱讀頁，圖片、音訊及影片使用瀏覽器播放器；實際可播放的編碼仍受瀏覽器支援限制。閱讀頁定期及重新取得焦點時核對權限，身份改變或無法確認權限時清空預覽。此檢查不會收回使用者已經下載的檔案。

已打包的網站也可由共用服務提供：

```sh
npm run build --prefix sample
npm run api --prefix sample
```

此時可開啟 `http://127.0.0.1:5180/login`。公開部署需要持久資料儲存、HTTPS 及明確允許的網址；本機測試成功不等於已部署。

## 驗證

```sh
npm test --prefix sample
npm run build --prefix sample
```

測試包含既有介面／業務檢查及實際 HTTP 的登入、權限、共用資料、同時修改、收費關係與重啟保存檢查；瀏覽器及效能驗收另記錄在進度文件。

## 合作方式

以 [AGENTS.md](AGENTS.md) 為準：一般開發用 `test`，只保留 `main`／`test`。沒有使用者明確指示，不操作 `main`，也不建立其他分支。修改後測試並打包；推送前核對遠端。每次提交交代分支、編號、內容及是否已推送。AGENTS.md 自身修改須按該文件的具體說明及確認程序處理。

公開網站和管理介面共用 `sample/src.js`、`sample/style.css`，同一時間需分清檔案負責人，保留其他協作者的工作。

## 素材

保留現有 Beamal 圖片及標誌，不自行生成或替換；來源見 `sample/ASSETS.md`。研究與虛構測試證據存於 `docs/schooltracs-rebuild/`；私人帳戶資料、密碼、原有提案 PDF、資料庫及瀏覽器儲存資料不屬程式提交內容。
