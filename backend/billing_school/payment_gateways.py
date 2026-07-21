# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
"""Nepal payment gateway integrations: eSewa and Khalti."""

import logging

import requests
from django.conf import settings

logger = logging.getLogger(__name__)


class EsewaGateway:
    """eSewa payment integration (form-redirect model)."""

    @staticmethod
    def get_merchant_code():
        return getattr(settings, "ESEWA_MERCHANT_CODE", "EPAYTEST")

    @staticmethod
    def get_payment_url():
        return getattr(
            settings, "ESEWA_PAYMENT_URL", "https://uat.esewa.com.np/epay/main"
        )

    @staticmethod
    def get_verify_url():
        return getattr(
            settings, "ESEWA_VERIFY_URL", "https://uat.esewa.com.np/epay/transrec"
        )

    @staticmethod
    def build_form_fields(
        student_fee_id: str, amount: float, success_url: str, failure_url: str
    ) -> dict:
        """Build the hidden form fields for eSewa redirect."""
        import uuid

        pid = f"sf_{student_fee_id.replace('-', '')[:16]}_{uuid.uuid4().hex[:6]}"
        return {
            "amt": str(amount),
            "txAmt": "0",
            "psc": "0",
            "pdc": "0",
            "scd": EsewaGateway.get_merchant_code(),
            "pid": pid,
            "su": success_url,
            "fu": failure_url,
            "_payment_url": EsewaGateway.get_payment_url(),
        }

    @staticmethod
    def verify_payment(oid: str, amt: str, ref_id: str) -> bool:
        """Verify eSewa payment by calling eSewa's verification endpoint."""
        try:
            resp = requests.post(
                EsewaGateway.get_verify_url(),
                data={
                    "amt": amt,
                    "rid": ref_id,
                    "pid": oid,
                    "scd": EsewaGateway.get_merchant_code(),
                },
                timeout=15,
            )
            if "<response_code>Success</response_code>" in resp.text:
                return True
            logger.warning("eSewa verification failed: %s", resp.text[:200])
            return False
        except Exception as exc:
            logger.error("eSewa verification error: %s", exc)
            return False


class KhaltiGateway:
    """Khalti payment integration (REST initiation + verification model)."""

    INITIATE_URL = "https://a.khalti.com/api/v2/epayment/initiate/"
    LOOKUP_URL = "https://a.khalti.com/api/v2/epayment/lookup/"

    @staticmethod
    def get_secret_key():
        return getattr(settings, "KHALTI_SECRET_KEY", "")

    @staticmethod
    def _headers():
        return {
            "Authorization": f"Key {KhaltiGateway.get_secret_key()}",
            "Content-Type": "application/json",
        }

    @staticmethod
    def initiate(
        amount_paisa: int,
        purchase_order_id: str,
        return_url: str,
        purchase_order_name: str,
        customer_name: str = "",
        customer_phone: str = "",
    ) -> dict:
        """Initiate a Khalti payment. Returns {'pidx': ..., 'payment_url': ...} or raises."""
        payload = {
            "return_url": return_url,
            "website_url": getattr(settings, "FRONTEND_URL", "http://localhost:3000"),
            "amount": amount_paisa,
            "purchase_order_id": purchase_order_id,
            "purchase_order_name": purchase_order_name,
            "customer_info": {
                "name": customer_name or "Student",
                "phone": customer_phone or "9800000000",
            },
        }
        resp = requests.post(
            KhaltiGateway.INITIATE_URL,
            json=payload,
            headers=KhaltiGateway._headers(),
            timeout=15,
        )
        resp.raise_for_status()
        return resp.json()  # {'pidx': '...', 'payment_url': '...', 'expires_at': '...'}

    @staticmethod
    def verify(pidx: str) -> dict:
        """Lookup/verify a Khalti payment by pidx. Returns full status dict."""
        resp = requests.post(
            KhaltiGateway.LOOKUP_URL,
            json={"pidx": pidx},
            headers=KhaltiGateway._headers(),
            timeout=15,
        )
        resp.raise_for_status()
        return (
            resp.json()
        )  # {'pidx': '...', 'status': 'Completed', 'total_amount': ...}


class ConnectIPSGateway:
    """
    ConnectIPS (NEPALPAY) payment integration.
    ConnectIPS is an inter-bank payment switch operated by Nepal Clearing House Ltd (NCHL).
    Uses HMAC-SHA256 signed token for security.
    """

    PAYMENT_URL = "https://connect.nepalpay.com.np/payment/request"
    VERIFY_URL = "https://connect.nepalpay.com.np/payment/statuscheck"
    # Sandbox:
    SANDBOX_PAYMENT_URL = "https://uat.connectips.com/connectipswebws/api/creditor/generatetokenformpayment"
    SANDBOX_VERIFY_URL = "https://uat.connectips.com/connectipswebws/api/creditor/getStatementDetailRequest"

    @staticmethod
    def _is_sandbox() -> bool:
        return getattr(settings, "CONNECTIPS_SANDBOX", True)

    @staticmethod
    def get_merchant_id() -> str:
        return getattr(settings, "CONNECTIPS_MERCHANT_ID", "TEST_MERCHANT")

    @staticmethod
    def get_app_id() -> str:
        return getattr(settings, "CONNECTIPS_APP_ID", "TEST_APP")

    @staticmethod
    def get_app_name() -> str:
        return getattr(settings, "CONNECTIPS_APP_NAME", "SikshyaSetu")

    @staticmethod
    def get_password() -> str:
        return getattr(settings, "CONNECTIPS_PASSWORD", "")

    @staticmethod
    def _build_token(
        merchant_id: str,
        app_id: str,
        app_name: str,
        txn_id: str,
        txn_date: str,
        txn_currency: str,
        txn_amount: int,
        reference_id: str,
        remarks: str,
        particulars: str,
    ) -> str:
        """
        Build HMAC-SHA256 signed token as per ConnectIPS spec.
        Token string: MERCHANTID=x,APPID=x,APPNAME=x,TXNID=x,TXNDATE=x,
                      TXNCRNCY=x,TXNAMT=x,REFERENCEID=x,REMARKS=x,PARTICULARS=x,TOKEN=TOKEN
        """
        import base64
        import hashlib
        import hmac

        password = ConnectIPSGateway.get_password()
        message = (
            f"MERCHANTID={merchant_id},"
            f"APPID={app_id},"
            f"APPNAME={app_name},"
            f"TXNID={txn_id},"
            f"TXNDATE={txn_date},"
            f"TXNCRNCY={txn_currency},"
            f"TXNAMT={txn_amount},"
            f"REFERENCEID={reference_id},"
            f"REMARKS={remarks},"
            f"PARTICULARS={particulars},"
            f"TOKEN=TOKEN"
        )
        key = password.encode("utf-8")
        signature = hmac.new(key, message.encode("utf-8"), hashlib.sha256).digest()
        return base64.b64encode(signature).decode("utf-8")

    @staticmethod
    def initiate(
        amount_paisa: int,
        purchase_order_id: str,
        return_url: str,
        remarks: str = "School Fee Payment",
    ) -> dict:
        """
        Initiate a ConnectIPS payment.
        amount_paisa: amount in paisa (NPR × 100)
        Returns form fields to POST to ConnectIPS payment page.
        """
        import uuid
        from datetime import date

        merchant_id = ConnectIPSGateway.get_merchant_id()
        app_id = ConnectIPSGateway.get_app_id()
        app_name = ConnectIPSGateway.get_app_name()
        txn_id = f"TXN{uuid.uuid4().hex[:12].upper()}"
        txn_date = date.today().strftime("%m/%d/%Y")
        currency = "NPR"
        reference_id = str(purchase_order_id)[:20]
        particulars = "School Fee"

        token = ConnectIPSGateway._build_token(
            merchant_id,
            app_id,
            app_name,
            txn_id,
            txn_date,
            currency,
            amount_paisa,
            reference_id,
            remarks,
            particulars,
        )

        payment_url = (
            ConnectIPSGateway.SANDBOX_PAYMENT_URL
            if ConnectIPSGateway._is_sandbox()
            else ConnectIPSGateway.PAYMENT_URL
        )

        return {
            "payment_url": payment_url,
            "form_fields": {
                "MERCHANTID": merchant_id,
                "APPID": app_id,
                "APPNAME": app_name,
                "TXNID": txn_id,
                "TXNDATE": txn_date,
                "TXNCRNCY": currency,
                "TXNAMT": str(amount_paisa),
                "REFERENCEID": reference_id,
                "REMARKS": remarks,
                "PARTICULARS": particulars,
                "TOKEN": token,
            },
            "_txn_id": txn_id,
            "_reference_id": reference_id,
        }

    @staticmethod
    def verify(txn_id: str, reference_id: str) -> dict:
        """Verify a ConnectIPS payment status."""
        import base64
        import hashlib
        import hmac

        merchant_id = ConnectIPSGateway.get_merchant_id()
        app_id = ConnectIPSGateway.get_app_id()
        password = ConnectIPSGateway.get_password()

        message = f"MERCHANTID={merchant_id},APPID={app_id},REFERENCEID={reference_id},TXNID={txn_id},TOKEN=TOKEN"
        key = password.encode("utf-8")
        signature = hmac.new(key, message.encode("utf-8"), hashlib.sha256).digest()
        token = base64.b64encode(signature).decode("utf-8")

        verify_url = (
            ConnectIPSGateway.SANDBOX_VERIFY_URL
            if ConnectIPSGateway._is_sandbox()
            else ConnectIPSGateway.VERIFY_URL
        )

        try:
            resp = requests.post(
                verify_url,
                json={
                    "merchantId": merchant_id,
                    "appId": app_id,
                    "referenceId": reference_id,
                    "txnId": txn_id,
                    "token": token,
                },
                timeout=15,
            )
            resp.raise_for_status()
            return resp.json()
        except Exception as exc:
            logger.error("ConnectIPS verification error: %s", exc)
            return {"status": "ERROR", "message": str(exc)}
