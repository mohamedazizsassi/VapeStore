-- Remove legacy "other" payment method and keep only cash/credit.
-- Existing "other" rows are mapped to "cash" before tightening the check.

alter table sales disable trigger t_sales_immutable;

update sales
set payment_method = 'cash'
where payment_method = 'other';

alter table sales enable trigger t_sales_immutable;

alter table sales drop constraint if exists sales_payment_method_check;
alter table sales add constraint sales_payment_method_check
  check (payment_method in ('cash', 'credit'));
