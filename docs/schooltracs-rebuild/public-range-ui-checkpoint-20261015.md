# 公開課表日期範圍：管理設定、訪客檢視及管理預覽

2026-10-15；test / 91ed611 後的 W-08 主要日期操作。整個公開報名、全 Course／Timetable、全 UI 及 Goal 仍未完成。

## 來源與設計決定

- Notion 本機需求快照 W-08：公開預設7日、最多30日、獨立於內部1–14日。原稿第4頁是跨月每週公開時段圖，沒有自行鎖定7／30日或移除Regular／Full用途。Research本輪重新目視p4及讀快照，報告 /tmp/beamal-public-w08-source-ux-review.md。
- 本輪提供7–30整數日選擇及訪客只改自己檢視，是相容的日期UI方案；最短7日及訪客override不是PDF逐字政策，也不是試課資格或預約期限。之後如確認需小於7日，可在同一資料契約擴充。
- 管理員在既有公開時段設定保存全中心預設；訪客改顯示日數不寫設定。管理預覽沿同一匿名投影和同一預設，另可暫時切換。內部時間表1–14日不變。
- 本輪沒有重新完成SchoolTracs公開流程；此項是Notion延伸，沒有把本機UI當來源服務已觀察的行為。

## 實作

- settings.rangeDays真保存，預設7；舊資料庫加range_days欄，原旗標／version／Slot不重設。舊PATCH省略rangeDays保原值；新欄必須整數7–30，依原version及audit保存。
- 匿名公開詳情可帶days臨時範圍；沒帶沿中心設定。回覆rangeDays/from/to及revision包含範圍；SDK保原前三參數，第四參數optional。額外／重複／不合法HTTP參數拒絕。
- 訪客及管理預覽同一日期renderer：完整24種日數、前後相同日數導航、清楚起訖、跨月／跨年、9999年上界clamp。公開白名單、Full顯隱、三種配額及資格不變。
- 快取key包含訪客override，預覽請求有序列核對；較舊範圍遲到成功／錯誤不能改新結果。背景預設更新可刷新未override畫面，不蓋明選8／30日。
- 清空日期保留空欄與修正提示、隱藏舊時段；重新載入使用最後合法日期。前後／日數操作及背景更新保合理鍵盤焦點。
- 獨立驗收發現手動Refresh保舊revision卻清ready，合法unchanged被誤判；已正式RED後改成要求完整來源、失效舊pending讀取，目錄及課程同時修正。第一次沒有來源的unchanged仍拒絕，不能造空資料。
- 管理預覽開確切Slot、詳情取消後仍保30日、日期／捲動／焦點；未更改正式課堂、學生或交易。

## 測試與獨立驗收

- Root範圍主案例5項先0/5 RED；日期／焦點／初次unchanged另3項0/3 RED；conditional reload另1項0/1 RED。修後targeted及全部原測試保留通過。
- Worker server／SDK新6項先RED再GREEN；完整3檔58/58、15.2秒，涵蓋舊schema migration／重開、版本及舊caller、省略與非法值、匿名無寫／跨年／date clamp。
- 獨立 /root/staff_leave_host_map 最終18/18：全部24日數、預設更新／明選不被蓋、舊range成功與503、同key conditional poll遇forceReload的遲到成功／失敗、firstunchanged、來源／身分／偽造Slot及settings契約。/tmp/beamal-w08-independent-composed-final.log；migration僅獨立code review，沒有冒稱QA真的操作DB。
- 初次完整1309/1309、55.907468542秒及build2.58秒，是conditional reload修正前版本，保留歷史而不冒充最後結果。
- 最後完整工作區 **1310/1310、0 fail/skip/cancel/todo、72.540823334秒**；隨後build **6.37秒、exit0**。/tmp/beamal-public-range-full-fixed.log、/tmp/beamal-public-range-build-fixed.log。既有大chunk warning仍在，不把build當效能通過。
- 最後乾淨提交副本結果另記；未包含協作者既有未追蹤Groups檔與其15測試。

## 真正畫面與持久資料

CUA隔離既有服務127.0.0.1:64048，更新服務前備份DB，保四老師／300學生／六課程；本輪只有經既有Admin真保存將公開預設7→14（version1），沒有直接改資料庫湊結果。

- 重載網站再開設定仍14；真正無Cookie匿名GET from10-15回14／to10-28／兩個原Slot。管理預覽同樣14日期。
- 管理預覽選30→10-15–11-13；開10-23 Leo確切詳情→Close仍30、焦點Manage。390中文from10-23–11-21，detail取消回30、body scrollTop521.5、focusManage、footer bottom835於844高視窗。
- 公開頁選30，Next30→11-14–12-13，實際焦點direction=next；空日期aria-invalid=true、Slot0及清楚錯誤，Reload恢復30及原合法日期。選8則10-23–10-30，Reload仍8；返回Admin設定仍14。訪客檢視不改中心預設。
- 768英文管理預覽跨年30日12-20–01-18，30個日期；實際點末日可捲至最後一格，scrollTop4258.5，末格在固定footer上方，焦點仍在dialog。
- 390／768／1280中英公開工具及設定／預覽均無整頁橫向溢出。手機欄位全寬、前後按鈕同寬，Tab從Save回Close，Escape返回；最後viewport還原，臨時tab23關閉，原使用者tab1保留。
- 七張截圖由獨立Agent只讀覆核：未見blocking重疊／裁切／貼邊。圖片只證畫面；捲動／保存／焦點以真操作及資料證據另記。截圖在 evidence/public-range-20261015/。
- 與更新前私人DB備份逐列比對people/courses/fees/schedules/available_slots/enrollment_orders/student_sessions/enrollment_sales/teacher_account_links/student_account_links十張業務表完全相同；只有預期公開setting/audit改動。沒有改Paid或學生關聯。
- 使用者原localhost:5173對應5180服務亦在備份原DB後更新同版；原中心預設仍7，未把隔離14設定帶回原資料。原資料保留核對結果另記。

## 尚未完成

公開Regular／Trial／Class Full／Trial Full組合、公開課型圖例、訪客指定Slot至試課表完整UI及最後真提交、資格／最後名額、全UI／完整功能與27項最終驗收仍是主要工作，不列minor。七日預設及既有Full政策不以本片重新裁定。

### 原使用者服務更新後核對

原資料庫備份後，5180以新程式重開；逐列比對除公開setting表外 **41張表完全不變**。公開setting原version2／兩旗標true均保留，只新增range_days預設7。原課程目前匿名詳情回404未公開，沒有為展示30日而擅自新增公開Slot；可用30日／保存鏈的真正GUI與匿名證據來自上述隔離中心，兩者明確分開。/tmp/beamal-public-range-user-verification.json。

### 提交副本結果

只含本次明列程式／文件／七張已獨立覆核截圖的乾淨checkout-index副本，npm ci exit0；完整 **1295/1295、0 fail/skip/cancel/todo、51.86868075秒**，隨後build **2.94秒、exit0**。/tmp/beamal-public-range-staged-{install,tests,build}.log。與工作區1310相差協作者未追蹤Groups的15測試，沒有加入本提交。額外桌面返回捲動截圖僅作補充/tmp證據，不代替日期工具完整畫面。
