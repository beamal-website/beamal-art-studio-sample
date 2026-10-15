# SchoolTracs Course / Fee 返回流程只讀觀察
日期：2026-10-16（香港時間）

## 範圍及停止原因
以現有 Chrome SchoolTracs 使用者分頁只讀查看 Courses / Fees 的 Create、既有 Course Edit 與取消返回。沒有填改欄位、切換設定、建立紀錄、Save、Delete 或提交付款。研究已按最新指示停止，優先交由主 Agent 處理學生／老師 mock data 合理性。

## 已實際觀察

### Courses 清單 → Create → Cancel
- 清單有 Export / Import / Create、Normal、Search course name、Category / Level。
- Create 開啟「Create course」彈窗，含 Course overview、Pricing、Booking expiry、Online Store；底部 Cancel / Create，標題旁 Close。
- 此次初始焦點在彈窗容器 DIV，並非 Course name 欄位。
- 未改值按 Cancel，彈窗關閉，返回原 Courses 清單及相同兩筆紀錄。
- 返回後實際 activeElement 是「Create」BUTTON。
- 清單當時在頁首（scrollX=0, scrollY=0），故只能證明此情境，不能宣稱非零捲動也會保留。

### 既有 Course 詳情 → Edit → Close
- 開啟既有課程後，詳情有 Go back、課名、頂部 Edit、General / Materials、Schedule、Fees、Settings。
- 頂部 Edit 開啟「Edit course」彈窗；Course name 已載入原值，另有 Category / Level。
- 此彈窗底部是 Delete / Save，標題旁 Close；沒有獨立 Cancel。
- 未改任何值，以 Close 關閉後，仍在同一 Course 詳情（/v4/web/courses/2）。
- 返回後實際 activeElement 是原頂部「Edit」BUTTON；scrollX=0, scrollY=0。

### Fees 清單 → Create
- 清單有 Export / Import / Create、Normal、Search，欄位包括 Name / Category / Applied to / Courses / Price / Booking expiry。
- Create 開啟「Create fee」彈窗：Fee name(display on receipt)、Category、三種 Pricing model、Booking expiry、Courses（Course name / Category / Level）及 Add course。
- 底部是 Cancel / Create，標題旁 Close；Cancel 的可存取名稱為圖示字「restore」。
- 此次初始焦點在 FORM 容器。
- 沒有填值、選 Pricing model、切換設定或按 Create。
- Cancel、Escape、Close 的輸入操作先後遭瀏覽器控制工具逾時，新的畫面仍是 Create fee。故不能把這段記成成功返回，也沒有足夠證據認定 SchoolTracs 本身取消功能失效。
- 未繼續查看既有 Fee 編輯，研究即按指示停止。

## 明確未知
- 成功 Create Course / Save Course / Create Fee / Save Fee 後的真正目的頁、焦點、排序與捲動均未觀察，因為本次不允許保存來源資料。
- 未驗證有 Search / Category / Level 篩選或非零捲動時的返回。
- 未驗證手機版、鍵盤完整導覽及成功儲存後的失敗重試。

## 可供 Beamal 採用的設計推論（不是 SchoolTracs 已觀察行為）
- 編輯既有課程取消／儲存後保留相同課程詳情、頁籤、位置與原按鈕焦點，是延續目前工作的合理最小流程。
- 從課程 Fees 區編輯費用，返回同一課程的費用區；從 Fees 清單編輯則返回原篩選清單並可辨認該筆。
- 新增課程成功後應讓使用者容易繼續安排該課程的 Fees / Schedule；可開啟精確新課程詳情。這是產品建議，不是來源已確認的成功流程。
- 不應因保存而無提示跳到不相關頁面或清除原清單條件；未真正保存不能顯示成功。

## 清理證據
已以原使用者分頁的原 Sales Courses URL 還原，並等待載入完成；最後實際畫面為 Sales 的 Courses 分頁、原兩項課程與空 Order Panel，沒有彈窗。此輪沒有建立任何新分頁，其他使用者分頁未操作。此後不再操作 SchoolTracs。
