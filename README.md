# Beamal Art Studio — Management Test System

網站及管理系統在 `sample/`，使用 Vite／原生 JavaScript，保留 Beamal 中英文及手機版。完整重建目標及進度見 [Goal](docs/schooltracs-rebuild/GOAL.md) 與 [進度](docs/schooltracs-rebuild/STATUS.md)。目前正逐頁接入共用服務，不能把尚未接駁的頁面當成已完成。

## 下載後直接開啟本機示例

**請下載 [`test` 分支](https://github.com/beamal-website/beamal-art-studio-sample/tree/test)，或使用 [test ZIP](https://github.com/beamal-website/beamal-art-studio-sample/archive/refs/heads/test.zip)。** GitHub 預設頁可能仍是 `main`；該分支不是目前這個版本。

1. 解壓縮到自己的電腦。需要先安裝 **Node.js LTS，22.13 或更新版本**（包含 npm）。
2. macOS 可雙擊根目錄的 `Start Beamal.command`；Windows 可開啟 `Start Beamal.cmd`。
3. 或在解壓縮後的根目錄開終端，只執行：

```sh
npm start
```

啟動器會安裝所需套件、打包目前程式、建立本機示例資料，再開啟登入頁。**網頁及資料服務由同一個入口啟動，毋須另外開後端或設定 `.env`。** 第一次需要網絡下載套件；保留終端開著。原有連接埠被其他程式使用時會另選一個本機連接埠，正確網址會印在終端，不會關閉其他服務。

| 身份 | 初始登入電郵 | 初始密碼 |
|---|---|---|
| 管理員兼老師 Maya | `admin@gmail.com` | `000000` |
| 普通老師 Leo | `teacher@gmail.com` | `000000` |
| 學生 Chloe | `student@gmail.com` | `000000` |

以上只是本機示例身份，不用登入 Gmail。資料包含四位老師、六種課程及 300 位 active 學生名冊；只有 Chloe 的兩份示例訂單已記為測試收款並連到七堂課，其餘 299 人沒有被補造為已付款報讀。

資料保存在 `sample/.data/local-demo/beamal.sqlite`，重開會保留修改，不會每次重建帳戶或重複加學生。關閉終端或按 `Ctrl+C` 停止。不同電腦的副本各有自己的示例資料，**GitHub 更新的是程式，不是共用的即時業務資料庫**；日後接同一部 server，才會跨電腦共用資料。

一般共用服務使用的 `sample/.data/beamal.sqlite` 不會被這個啟動器讀取、重設或替換。不要提交 `.data`、資料庫、bootstrap 憑證或 `.env`。示例身份及資料由程式首次建立，所以全新下載不依賴開發者電腦的私有檔案。

若啟動失敗，終端會說明是 Node/npm、套件安裝或 build 問題，並停止啟動，不會只開一個無法登入的頁面。單獨開 `index.html`、只執行舊 `npm run dev`、或使用 `npm run preview`，都不等於已啟動本機資料服務。

目前仍有未接保存／發送的介面，不能把可開啟示例當作完整系統交付。按使用者最新安排，發布現版後只集中完成 Course、Timetable 及其直接關連流程。

## 工程開發：分開執行網頁與一般資料服務

以下保留給需要開發時自動更新程式的工程師。需要 Node.js **22.13 或更新版本**（本次驗證 22.23.1）。第一次先安裝依賴：

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

這個一般 `api` 入口首次會建立 `@beamal.test` 隨機密碼帳戶，憑證保存在本機 `sample/.data/bootstrap-accounts.json`，不會提交到 GitHub；它不是上面的 `@gmail.com / 000000` 示例入口。既有資料不會被重設。要使用三個指定示例帳戶，請用上面的 `npm start`。

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
