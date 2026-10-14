# 驗收入口

完整目標：[GOAL.md](../docs/schooltracs-rebuild/GOAL.md)。逐頁狀態及實測證據：[STATUS.md](../docs/schooltracs-rebuild/STATUS.md)。

每次功能修改執行：

```sh
npm test --prefix sample
npm run build --prefix sample
```

- `tests/flows.test.mjs`：原有介面及業務邏輯；共享模式的非同步失敗情況另有回歸檢查。
- `server/tests/`：實際 HTTP、獨立登入 Cookie、權限、課程與費用共用、版本衝突、同時新增、重開資料庫及重試。
- 瀏覽器：兩個獨立身份、正常及錯誤輸入、儲存及重新開啟、中英文、手機、鍵盤及跨頁結果。
- 效能：記錄機器／瀏覽器／資料量及操作耗時；自動測試耗時不等於介面操作速度。

尚未測試、尚未接入共用資料或仍禁用的功能，均不能標示為完整系統已通過。參考研究文件須分開實際保存證據與只有查看表單的觀察。
