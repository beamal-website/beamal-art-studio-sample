# Courses＋Timetable 中期補充研究

日期：2026-10-14（香港時間）。本檔只整理統籌 Agent 已直接操作 SchoolTracs 的結果，以及 Research Agent 親自檢視的持久截圖；不把 Beamal 程式或測試當作原系統行為證據。

## 本輪操作及未改動邊界

- 統籌重新取得使用者指定的 Chrome 分頁 `846615854`，從 Timetable 開啟原有 Q 課堂，再開啟 Edit activity。
- 沒有改欄位值，沒有按 Save 或 Delete。之後關閉編輯表單，再關閉課堂詳情，返回 Timetable。
- Research Agent 嘗試接手時，指定分頁仍由統籌原工作階段持有；沒有取得控制，沒有操作其他分頁，也沒有另行操作原系統。後續畫面事實以下述統籌回報及截圖為準。

## Q：Edit activity 草稿

| 項目 | 已直接觀察的結果 | 證據邊界 |
| --- | --- | --- |
| 入口 | Timetable → 原有 Q 課堂 → Edit activity；表單標題 Edit Q | 沒有測試其他課程／其他類型課堂 |
| Course | Q；有 Course、Colour 及費用摘要區 | 沒有改選課程或顏色 |
| Start date | `2026-10-15` | 這是此次所開課堂編輯畫面的值，不能推成整套原排課的首次日期 |
| End | `2026-10-29` | 只確認顯示範圍；沒有改結束方式或保存 |
| Start time／Duration | `10:00`／`45 min`，時長標籤亦標示結束於 `10:45` | 沒有改時間或時長 |
| 重複敘述 | 每星期四，從 2026-10-15 至 2026-10-29，旁有 Preview | 本輪沒有開啟此編輯狀態的 Preview |
| Session | 統籌直接觀察為 `2` | 保存截圖底部被固定按鈕區遮住，只能看到 Session 標籤，數值不在該圖可見範圍 |
| 其他欄位 | Teacher、Room；下方有 Capacity／Session 區域 | 本輪沒有修改或保存 |
| 動作 | 固定底部有 Delete／Save，頂部有關閉按鈕 | 沒有按 Delete／Save；只使用關閉退出 |

[Edit Q 原系統截圖](evidence/schooltracs-timetable-edit-series.png)

Research Agent 已親自檢視此截圖，確認 Edit Q、上述開始／結束日期、時間／時長、重複敘述，以及 Save／Delete 按鈕同時可見。

## 不能從本輪推出的規則

- Edit activity **會帶出重複範圍欄位**；這不等於已確認保存會修改「單節、未來課節、整套重複排課」中的哪一種範圍。
- 此次 Start date 為 10 月 15 日、Session 為 2，不足以單憑畫面判定「只修改由第二節開始的未來課節」。本輪沒有保存、觀察範圍選擇提示或檢查保存後資料。
- 同理，不能把 Beamal 目前採用的整套重複排課修改／刪除方式，描述為已完整複製 SchoolTracs 的保存效果。
- Delete 是否會先顯示確認、刪除範圍、原有報名及費用如何處理、能否還原，本輪均未確認。

## Courses 狀態篩選：本輪已直接觀察

- 統籌從現有畫面進入 Courses，載入後有兩列：`Beamal QA 20261014`、`Q`。
- Name／Category／Level／Follows term 表頭為 button；有搜尋欄及 Category／Level combobox。本輪確認控制項存在，沒有逐項測試搜尋、排序方向或篩選配對規則。
- 按 Normal 展開狀態選單，明確列出 **Normal、Deleted**。
- 選 Deleted，待畫面載入完成後顯示 **No deleted course yet**，表格 rowgroup 為空。
- 沒有任何已刪課程列可供檢視，故本輪**仍無法確認 Restore 入口、還原提示或實際還原結果**；空清單不代表原系統沒有還原功能。
- 隨後已返回 Normal，再點 `Beamal QA 20261014` 進入詳情；待載入完成後，統籌已開啟 Edit，結果見下節。

[Deleted 空清單原系統截圖](evidence/schooltracs-courses-deleted-empty.png)

Research Agent 已親自檢視截圖，確認已選 Deleted、表頭、搜尋及 Category／Level 控制項，以及 No deleted course yet 訊息；Normal 展開選項與返回後操作來自統籌直接觀察回報。

## Edit course：本輪已直接觀察

- 路徑：Normal 課程列表 → `Beamal QA 20261014` 詳情 → Edit。
- 開啟的 Edit course 對話框有 Close、Course name（值為 `Beamal QA 20261014`）、Category (optional)、Level (optional)，底部有 Delete 及 Save。
- 統籌沒有改值，沒有按 Delete／Save；只按 Close 關閉編輯視窗。
- 此次重新確認了欄位及刪除入口，**沒有確認 Delete 是否先顯示提示、真正刪除／保存的結果或還原行為**。

[Edit course 與 Delete 入口原系統截圖](evidence/schooltracs-course-edit-delete.png)

Research Agent 已親自檢視此圖，確認上述欄位值、Close 圖示及 Delete／Save 按鈕。關閉結果由統籌直接操作回報；沒有進一步操作原系統。此結果補充 [既有 Courses／Fees 研究](research-courses-fees.md)，不增加原系統保存或刪除證據。

## Courses 刪除／還原：仍待補查

| 待查項目 | 本輪狀態 |
| --- | --- |
| Courses 狀態選單的確切選項、切到 Deleted 後畫面 | 本輪已確認 Normal／Deleted；Deleted 完成載入後為空清單 |
| Edit course → Delete 是否先顯示確認提示 | 已重新看見 Delete 入口，但未按；不能假定有第二次確認而直接點擊未知最終刪除動作 |
| Deleted 列表是否有 Restore 入口、是否可開啟還原草稿／確認 | 沒有已刪課程可供檢視，仍未確認；不執行最終還原 |
| 真正刪除及還原後的跨頁／關聯影響 | 未測；本輪不修改原資料 |

上述未確認項目仍保留為未研究／未測保存，不標示通過。這份補充文件不代表 Courses＋Timetable 已完成整頁驗收。

## 2026-10-14 補充：Beamal 可還原刪課的服務切片

本節追加 Beamal 的實作與測試結果，**不是新增 SchoolTracs 的刪除／還原操作證據**。前述只看過 Normal／Deleted、空 Deleted 清單，以及 Edit course 的 Delete／Save；仍沒有在原系統按 Delete 或完成 Restore，不能據此稱兩套系統的刪課效果一模一樣。

為避免失去既有課程資料，Beamal 本輪採用以下**暫定保護規則**：

| 項目 | Beamal 本輪服務行為 | 原系統證據狀態 |
| --- | --- | --- |
| 可還原刪除 | 標記刪除，保留原課程 ID、courseCode、費用連結、教材、附件及稽核記錄；還原同一筆資料 | 原系統實際刪除及還原未測 |
| 排課保護 | 有未刪除排課時回覆 `409 COURSE_HAS_SCHEDULES`；須先處理排課，已刪除排課不阻擋刪課 | 是 Beamal 暫定業務保護，未確認 SchoolTracs 是否相同 |
| 還原順序 | 課程已刪除時不可新增排課或還原其已刪排課；先還原課程才可還原排課 | 是 Beamal 暫定規則，不是原系統保存結果 |
| 學生存取 | 不向學生列出已刪課程或其費用關聯 ID；原有授權學生亦不能透過直接教材／附件網址讀取；還原後保留的授權及可見設定重新生效 | 服務權限以合成帳戶及實際 HTTP 驗證，尚未對照原系統學生端 |
| 名稱及費用 | 已刪課程名稱仍保留，不建立同名替代課程；既有費用可保留原連結及修改資料，新連結不可指向已刪課程 | 名稱保留及新連結限制屬 Beamal 暫定選擇 |

本輪服務驗證為 **40／40 通過**：7 項新增課程生命週期測試，以及既有 catalog 5 項、fees 12 項、schedules 6 項、materials 10 項。包括跨管理員讀取、刪除狀態重開資料庫、費用及教材保留、實際 PNG 附件的學生拒絕／還原、版本衝突、重試及交易回滾。完整命令及證據邊界見 [課程刪除／還原檢查點](course-lifecycle-checkpoint.md)。

**學生報名、訂單、付款及出席的刪課連動仍未完成，屬重要業務依賴，不是 minor。** 現有教材授權測試不等於已驗證完整學生報名關係。前端操作、全套測試與打包、桌面／手機及真正瀏覽器的本輪驗收，留待統籌核實並補記；本節不將整頁或完整 Goal 標為完成。
