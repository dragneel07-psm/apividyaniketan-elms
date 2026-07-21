# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
import io
import logging

from django.http import HttpResponse
from django.template.loader import render_to_string

logger = logging.getLogger(__name__)


def _render_with_weasyprint(html: str) -> bytes | None:
    try:
        from weasyprint import HTML  # type: ignore
    except Exception:
        return None
    try:
        return HTML(string=html).write_pdf()
    except Exception:
        logger.exception("WeasyPrint failed to render PDF")
        return None


def _render_with_xhtml2pdf(html: str) -> bytes | None:
    try:
        from xhtml2pdf import pisa  # type: ignore
    except Exception:
        return None
    result = io.BytesIO()
    try:
        pdf = pisa.pisaDocument(io.BytesIO(html.encode("UTF-8")), result)
    except Exception:
        logger.exception("xhtml2pdf failed to render PDF")
        return None
    if pdf and not pdf.err:
        return result.getvalue()
    if pdf and pdf.err:
        logger.warning("xhtml2pdf returned parser errors")
    return None


def generate_pdf_response(template_path, context, filename):
    """
    Render a Django template and return it as a PDF HttpResponse.

    Tries WeasyPrint first (full CSS3 support: gradients, flexbox, custom fonts);
    falls back to xhtml2pdf for environments where WeasyPrint's native libs are
    missing. Final fallback ships the raw HTML so the user gets *something*.
    """
    try:
        html = render_to_string(template_path, context)
    except Exception:
        logger.exception("Failed to render report template %s", template_path)
        return None

    pdf_bytes = _render_with_weasyprint(html) or _render_with_xhtml2pdf(html)
    if pdf_bytes:
        response = HttpResponse(pdf_bytes, content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        return response

    logger.warning(
        "Both PDF renderers failed for template %s; serving HTML", template_path
    )
    response = HttpResponse(html, content_type="text/html; charset=utf-8")
    response["Content-Disposition"] = (
        f'attachment; filename="{filename.rsplit(".", 1)[0]}.html"'
    )
    response["X-Report-Fallback"] = "html"
    return response


def generate_excel_response(data, columns, filename):
    """
    Generates an Excel response from a list of dictionaries.
    """
    import pandas as pd

    df = pd.DataFrame(data, columns=columns)
    output = io.BytesIO()

    with pd.ExcelWriter(output, engine="openpyxl") as writer:
        df.to_excel(writer, index=False, sheet_name="Sheet1")

    response = HttpResponse(
        output.getvalue(),
        content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )
    response["Content-Disposition"] = f'attachment; filename="{filename}"'
    return response
