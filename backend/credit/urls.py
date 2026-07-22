from django.urls import path

from credit.views import CreditListCreateView, CreditPaymentView

urlpatterns = [
    path("", CreditListCreateView.as_view(), name="credit-list-create"),
    path("<uuid:credit_id>/payment/", CreditPaymentView.as_view(), name="credit-payment"),
]
