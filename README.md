# Beamal Art Studio — Website Sample

私人網站及 Student / Teacher 管理介面樣板。網站程式在 `sample/`。

## 本機開啟

需要 Node.js 20.19+ 或 22.12+。

```sh
cd sample
npm ci
npm run dev
```

在瀏覽器開啟終端顯示的網址（通常是 http://localhost:5173）。

```sh
npm test
npm run build
```

## 登入及資料

- Username `1`：Student（Alex Chan）；`2`：Teacher 1 (Manager)。密碼留空。
- 所有資料為瀏覽器內的樣板資料，沒有真實登入驗證、收款、寄信或跨裝置同步。
- Reset 回復初始資料：Alex Chan 未報名，David Leung 已報 Course 1 / 2，Ryan Yu 已報 Course 2 / 3。
- 新增班別支援手動課程名稱、多個星期及可修改而不可重複的 Class code。
- 已登入的公開頁面以人形頭像作帳戶入口。中英文切換在右上角。
- 收款頁有付款日期、月度圖表及 Excel 匯出。檔案生成有測試，實際瀏覽器下載仍須核對。
- 這個 repository 不是部署網址；Vercel 部署仍未完成。

## 合作方式

1. 每人從最新 main 開一條獨立 branch（修改分支），例如 `codex/teacher-layout`。
2. 修改後執行測試及 build，再 push 到自己的分支。
3. 開 Pull Request（修改申請），檢查後才合併到 main。
4. 盡量分開修改範圍；公開網站及管理介面目前共用 `sample/src.js` 和 `sample/style.css`，合併時需留意重疊修改。

## 素材

圖片及標誌屬原擁有人。僅供內部樣板審閱；來源見 `sample/ASSETS.md`。未包含私人研究文件、電郵、ZIP 備份或瀏覽器儲存資料。
