# 日期及指定課堂備忘：輸入／核對 UI 檢查點

日期：2026-10-15，香港時間。基準 `test` / `e3bd079` 之後的限定切片；完整 Goal 仍未完成。本片只完成未保存草稿的入口、輸入、核對及取消返回，不把 TM-01／TM-02 的持久備忘功能標成通過。

## 來源及界線

- Notion 主文快照 `notion-requirements-source.md` §17.2.4、TM-01／TM-02、EX-24；採用 v2.5 Goal §8.2 的日期／具體課次純文字備忘方向。這不是本輪重新讀取線上 Notion 的聲明。
- 2026-10-15 Research Agent `/root/accounting_return_contract` 實際 Chrome 只讀觀察：SchoolTracs 課堂有 Remark／Details／More info，Edit 的 More info 明寫會在學生 App 顯示；Edit 同時列起訖日期，未保存，不能據此證明 Remark 是單堂內部備忘。日期標題沒有觀察到獨立日期備忘入口。Beamal 這段是已確認 Notion 延伸，不能以 Remark 欄位代替或假稱完整來源對齊。
- 純文字不更改出席、假期、座位、付款或待辦；不把學生個別 Remark／Sticker、排課 remark 或學生可見 moreInfo 當成同一來源。
- 普通老師可在已載入、已授權日曆的可見日期輸入未保存草稿，也可從精確授權課堂輸入。本片不讀取同事已保存備忘，亦不藉此決定未來日期備忘的正式寫入／共享權限。
- 鍵盤設計參考 [W3C APG Modal Dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) 的視窗內焦點、Escape 及返回原入口原則。這是限定實作／走查，不是全面無障礙認證。

## 使用者實際得到的操作

- 日／週／1–14 日／月／列表，在日期旁有具名稱的小圖示；月曆日期與備忘是兩個相鄰原生按鈕，沒有在按鈕內再放按鈕。
- 課堂詳情標題旁有備忘入口；綁固定 schedule ID、正整數課次及實際日期。課程、日期、時間和第幾堂清楚顯示，不以同課名或第一筆示例替代。
- 輸入最多 2,000 字、保留換行；空白及超長有欄位錯誤。核對後可以返回修改；最後 Save 停用，直接偽造按鈕／submit 也不會保存或顯示成功。
- 返回修改保留草稿、文字選取方向、文字框及內容區捲動；取消回原日期／課堂，再關課堂回原課程月份與同一堂入口。
- 十四日的兩個捲動區各自還原。真正瀏覽器的 PageDown 有短暫捲動動畫，驗收先待自然操作穩定再比較位置，沒有把動畫中不同時點的值當成程式錯誤。
- 學生／匿名沒有內部備忘入口；偽造入口及身份／權限／課次失效後的舊動作不能重開私人草稿。

## 原先發現及本片修正

獨立原測 10 案例為 7 通過、3 失敗；三項均先以正式失敗測試重現，再修正：

1. 課堂名單遲到或每五秒背景回覆會把備忘改畫為課堂詳情。現在仍更新授權名單快取，但輸入中不重建備忘；取消後課堂讀到最新名單或正常錯誤狀態。
2. Edit → Review → Back 丟失選取及捲動。現在離開編輯前記住位置，回編輯時先安全聚焦，再還原選取與捲動。
3. 焦點在視窗外按 Tab 沒有拉回。現在連隱藏項及空控制清單都處理，避免焦點跑到背景。

## 驗收證據

- `npm test --prefix sample`：1264／1264、0 fail／skip／cancel，50.915654625 秒；`/tmp/beamal-notes-final-workspace-test.log`。此數包含工作區其他未提交模組，提交快照結果另記。
- `npm run build --prefix sample`：成功，12.26 秒；`/tmp/beamal-notes-final-workspace-build.log`。既有大檔案提示仍在，不冒稱已完成效能／容量驗收。
- 獨立驗收 `/root/staff_leave_host_map`：原封 10／10，再加遲到成功／錯誤名單、空控制列表等 3／3，共 13／13；`/tmp/beamal-notes-independent-final.log`、`/tmp/beamal-notes-repair-regression.log`。沒有弱化舊斷言。
- 純 UI 10 案例；host 9 案例涵蓋精確日期、課次、身份失效、雙區捲動、原生換行／輸入法、遲到名單、選取／捲動及鍵盤焦點。沒有新增備忘資料服務或假保存。
- CUA 真正 IAB：隔離私有資料服務 `127.0.0.1:64048`，沿用 4 老師／300 學生／6 課程，三個授權 mock 帳戶實際登入。沒有重設使用者原本資料或改原課表。
- Admin 五檢視：日 10-15、週 10-12、月相鄰日期 09-28、列表 10-16、自訂範圍及 14 日第二排 10-22；開備忘不把選中日期偷偷改成另一日。
- Course → 創意繪畫 10-23 第 2 堂 → 備忘 → 取消 → 同第 2 堂 → 關閉，焦點回 `View lesson details 2026-10-23`，網址仍是原課程。
- 長中文草稿 570 字，原生向左選取 568–570、backward、文字框 scrollTop 478.5；Review → Back 後四者相同。背景名單更新後另一份中文單堂草稿仍保留。
- 實際 CSS 390×844、768×1024、1280×900：頁面 scrollWidth 等於 clientWidth；備忘內捲動、標題／關閉／底部操作可用，主要按鈕至少 44px。中英 UI 及中文內容均已看過。
- Teacher：可見空日期草稿及自己第 1 堂備忘可開；沒有因此啟用修改排課。Student：真實課表載入後內部備忘入口 0、沒有備忘表單。控制台沒有此次相關 error／warn。

圖片：

- [Admin 1280 長文核對](evidence/timetable-notes-20261015/admin-date-review-1280.png)
- [Teacher 390 中文核對](evidence/timetable-notes-20261015/teacher-date-review-390.png)
- [Course 第 2 堂 768 輸入](evidence/timetable-notes-20261015/course-lesson-note-768.png)

## 仍須完成

- 已保存備忘的正式來源、讀取／建立／修改、作者／修改時間、版本衝突、正式日期共享範圍、多人同步、重啟保存及歷史；不得把未保存草稿展示當作這些功能完成。
- 真正保存後的讀取／空資料／錯誤狀態與端到端返回驗收，依前述正式來源接線後補齊。
- 全 Course／Timetable、全 UI、後續主功能、來源對照、合理報讀歷史、效能及 27 個最終情境仍未完成。本片不更改 Goal 範圍，也不將核心功能列為 minor。

提交前獨立暫存快照（只包含本次明列檔案及既有已追蹤來源，不帶入其他未追蹤模組）：`npm test --prefix sample` **1249／1249、0 fail／skip／cancel，48.213836625 秒**；`npm run build --prefix sample` **成功，12.63 秒**。日誌 `/tmp/beamal-notes-staged-tests.log`、`/tmp/beamal-notes-staged-build.log`。與上方1264的差異為未包含工作區其他人的15項未追蹤測試；不是跳過或刪除已追蹤測試。
