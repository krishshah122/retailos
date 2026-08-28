from django.urls import path

from credit.views import CreditListCreateView, CreditPaymentView, CustomerListView

urlpatterns = [
    path("", CreditListCreateView.as_view(), name="credit-list-create"),
    path("customers", CustomerListView.as_view(), name="customer-list"),
    path("customers/", CustomerListView.as_view(), name="customer-list-slash"),
    path("<uuid:credit_id>/payment/", CreditPaymentView.as_view(), name="credit-payment"),
]
