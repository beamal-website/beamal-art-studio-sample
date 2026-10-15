# Student → exact lesson → purchased order：來源與關係核對
日期：2026-10-16。只讀研究；未操作 browser、API、DB、Git、正式程式或文件。主 Agent 同時整合來源 helper / host，本報告只界定所需契約，不把施工中的 stub 當產品缺陷。

## 本輪實際來源
- 原 PDF 原件 SHA-256 重新核對：ffffe3efea424f501c13172e7ea9d80056a041158f3d4ed1e969de64b5d3a55e。
- 重新渲染並完整目視 p3、p5、p6（/tmp/beamal-student-order-source-pdf/page-{3,5,6}.png）；重開已核對同 SHA 的 p1 渲染。
- PDF p3：單堂名冊逐位學生並列 Order、Payment、Attendance、Remarks；Order 例為720/720min與起訖期間；不定義資料鍵或扣減算法。
- PDF p5：家長看自己學生資料、已報讀課堂日期、單據、繳費／續報；家庭可多個孩子，各人需分清。
- PDF p6：先選學生再選Fees/Courses/Products；All Lessons / Single Lesson；老師送單、家長確認與老師Confirm Payment分開。
- Notion 本機快照：notion-requirements-source.md:3–5記最後編輯2026-10-11、取得2026-10-14；本輪沒有抓live Notion。
- 精確需求：同檔:37–44（ClassSession / StudentSession粒度）、:100（名冊及學生資料）、:143–146（Confirm Payment連課表）、:251–252（本人已報課程及Payment History）、:267–270（多孩子獨立、非同電話授權）。
- register JSON：C-07約:80–86、F-07:174–182、O-04/O-05:376–390；PDF對照:71–72保留原購／剩餘／期間差別。

## 已確認的實際程式關係
1. sample/server/enrollment-orders.mjs:46–53：
   student_sessions.id 是「學生課次」ID；另存student_id、schedule_id、sequence、order_id，且UNIQUE(student_id,schedule_id,sequence)。不要把row.id誤當studentId或orderId。
2. :139–154：
   建立訂單時精確驗Course ID、Fee ID及已儲存關聯；每個item的lessons以scheduleId+sequence+sourceVersion定位，快照當時date/time/duration；item保存courseId/courseName/feeId/feeName/pricing。全單不能重複選同一課次。
3. :184–199：
   只有parent-confirmed + awaiting-payment的訂單經Admin確認後，才逐堂插入StudentSession並綁同一order_id；原價、所選堂數不是Remaining ledger。
4. :203–209：
   學生課表按student_account_links授權且只讀paid，從目前schedule occurrence取得當前日期／時間／課程，另回原orderId。因此「現在課次日期」可與「原下單日期」不同。
5. :214–219：
   Admin／Teacher名冊按精確schedule+sequence取paid學生；Teacher另經當前scope核對。row DTO有id/studentId/orderId/paymentStatus/attendance，但沒有feeId。
6. :113–126：
   Student可讀非draft且明確連到自己的order.studentId；Teacher需訂單全部items的所有目前lessons均在scope，否則404；不是只要看到其中一堂就可讀整張跨scope單。
7. sample/server/app.mjs:249–250、264–267與client/api-client.js約:138：
   GET /orders/:encodedId逐次服務授權；名冊亦獨立授權。應讀真服務，不以頁面role或local cache當權限。

## 本片 UI 必須拒絕的模糊／洩露
- 來源cache不ready／error、孩子不在本次授權students、孤兒StudentSession、空/重複ID、同一學生課次出現矛盾多筆：不得猜第一筆。
- 指令的sessionId + studentId + orderId必須同一正式row。成功HTTP仍須核對回覆order.id、order.studentId及paid；同一家長可看兩個孩子，不代表按哥哥可偷換弟弟單。
- 用唯一order item的courseId + lesson.scheduleId + lesson.sequence核對來源；名冊沒有feeId，不可先借目前Course第一個Fee再找訂單。重複匹配兩個item或同item重複課次應拒絕。
- **不要要求訂單快照日期／時間等於當前課次日期／時間**：正常移日會不同。固定身份相符且course相符才可用。若改成另一Course，原／新課程映射未定，應拒錯配而非按同名補配。
- async讀取期間換孩子、身份/權限、頁籤、顯示range或正式row來源變更：舊回覆不可打開／復活私人單，也不可返回不再有效的舊按鈕；同身份失敗重試不借上一人資料。
- Teacher看得到名冊卻GET整單404是合法限制，不能用先前Admin cache或截出第一個可見item繞過服務。
- 展示原單snapshot並標明下單安排；不要用現Fee、改期後時長、purchasedLessons或所選課節數重算原購額度/Remaining/有效期/組合。
- 720/720min截圖只是需求方向，不是允許本機自行造720 Remaining。跨孩子、不同items、minutes/visits不得加總成一個餘額。

## 尚待政策／不阻礙本片只讀
- 個別Make Up真正換scheduleId/sequence時，原StudentSession到新課次及原order item的正式映射尚未實作；不能假設原date查找足夠或現在所有可看課都等價。
- minutes/visits扣額、Attendance／補課／退款逆向、有效期及組合owner仍未定；本片只讀原購snapshot，不接這些算法。
- schema FK分別存在，沒有SQL複合約束強制sessions.student_id等於orders.student_id或order.items包含該tuple；正常create/confirm路徑保證，但舊壞資料／手工匯入仍需UI精確拒絕，不靠FK推定永遠一致。

## 下一個高價值 Stage A（完成本片後）
**建議只再補一個主要的Course缺口：課程內容／適齡的完整查看→Admin草稿編輯→核對→返回／取消，以及對應公開課程說明區。**
- 來源：Goal:200要求內容、適齡、時長；Notion:22/W-02同樣；PDF p1明列課程年齡與時長。這是完整主要功能區，不是再微調同一個quota文案。
- 現況證據：validation.mjs:79–92正式Course欄僅name/category/level/publicColor/classType+pricing；store.mjs:21 metadata同樣無內容／適齡；available-slots.mjs:104 courseDTO及availability-ui.js:60,100只有名稱、分類、級別／顏色和時段，沒有該完整內容區。不能以舊靜態courses.age示例當canonical。
- Stage A可交付：exactCourse ID上下文、內容文字、明確可選的適齡顯示（未知/未填分開）、固定時長與Fee/組合分段時長分清；長文／雙語／手機／鍵盤／返回；最後未接保存仍停用，不硬加報名年齡門檻，不把PDF有矛盾的例子映射到目前六課。
- 做完這一條的獨立/GUI驗收即應轉**Products主要流程**，符合Goal:88「Course+Fee+TT → Products → Students → Accounting → Reports → Staff」。不要因Remaining ledger政策未定而無限留在order summary，也不要跳去擴充無關Staff或通知模組。
- v2-ui-inventory.md為2026-10-15歷史盤點，:48/:54/:80–85可作後續缺口清單；其舊行號、未接狀態不能當今天完成/未完成證據，需每片重新看code。
