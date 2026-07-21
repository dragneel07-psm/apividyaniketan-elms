from django.db import migrations, models
import decimal


class Migration(migrations.Migration):
    dependencies = [("hr_payroll", "0001_initial")]
    operations = [
        migrations.AddField(model_name="employee", name="pan_number", field=models.CharField(blank=True, max_length=20)),
        migrations.AddField(model_name="employee", name="marital_status", field=models.CharField(choices=[("single", "Single"), ("couple", "Couple")], default="single", max_length=10)),
        migrations.AddField(model_name="employee", name="social_security_scheme", field=models.CharField(choices=[("none", "None"), ("pf", "Employees Provident Fund"), ("ssf", "Social Security Fund")], default="pf", max_length=10)),
        migrations.AddField(model_name="employee", name="pf_number", field=models.CharField(blank=True, max_length=30)),
        migrations.AddField(model_name="employee", name="ssf_number", field=models.CharField(blank=True, max_length=30)),
        migrations.AddField(model_name="employee", name="cit_number", field=models.CharField(blank=True, max_length=30)),
        migrations.AddField(model_name="employee", name="recurring_cit_monthly", field=models.DecimalField(decimal_places=2, default=decimal.Decimal("0"), max_digits=12)),
        migrations.AddField(model_name="employee", name="insurance_monthly", field=models.DecimalField(decimal_places=2, default=decimal.Decimal("0"), max_digits=12)),
        migrations.AddField(model_name="salaryslip", name="ssf_employee", field=models.DecimalField(decimal_places=2, default=decimal.Decimal("0"), max_digits=10)),
        migrations.AddField(model_name="salaryslip", name="ssf_employer", field=models.DecimalField(decimal_places=2, default=decimal.Decimal("0"), max_digits=10)),
        migrations.AddField(model_name="salaryslip", name="cit_deduction", field=models.DecimalField(decimal_places=2, default=decimal.Decimal("0"), max_digits=10)),
        migrations.AddField(model_name="salaryslip", name="insurance_deduction", field=models.DecimalField(decimal_places=2, default=decimal.Decimal("0"), max_digits=10)),
        migrations.AddField(model_name="salaryslip", name="taxable_income_annual", field=models.DecimalField(decimal_places=2, default=decimal.Decimal("0"), max_digits=14)),
        migrations.AddField(model_name="salaryslip", name="annual_tax_liability", field=models.DecimalField(decimal_places=2, default=decimal.Decimal("0"), max_digits=14)),
        migrations.AddField(model_name="salaryslip", name="employer_cost", field=models.DecimalField(decimal_places=2, default=decimal.Decimal("0"), max_digits=14)),
        migrations.AddField(model_name="salaryslip", name="fiscal_year_bs", field=models.CharField(blank=True, max_length=9)),
        migrations.AddField(model_name="salaryslip", name="calculation_snapshot", field=models.JSONField(blank=True, default=dict)),
    ]
