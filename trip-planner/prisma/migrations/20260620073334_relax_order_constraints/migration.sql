-- DropIndex
DROP INDEX "Activity_dayId_order_key";

-- DropIndex
DROP INDEX "Booking_tripId_order_key";

-- DropIndex
DROP INDEX "Day_tripId_order_key";

-- DropIndex
DROP INDEX "Expense_tripId_order_key";

-- DropIndex
DROP INDEX "Member_tripId_order_key";

-- DropIndex
DROP INDEX "SavedPlace_tripId_order_key";

-- CreateIndex
CREATE INDEX "Activity_dayId_order_idx" ON "Activity"("dayId", "order");

-- CreateIndex
CREATE INDEX "Booking_tripId_order_idx" ON "Booking"("tripId", "order");

-- CreateIndex
CREATE INDEX "Day_tripId_order_idx" ON "Day"("tripId", "order");

-- CreateIndex
CREATE INDEX "Expense_tripId_order_idx" ON "Expense"("tripId", "order");

-- CreateIndex
CREATE INDEX "Member_tripId_order_idx" ON "Member"("tripId", "order");

-- CreateIndex
CREATE INDEX "SavedPlace_tripId_order_idx" ON "SavedPlace"("tripId", "order");
