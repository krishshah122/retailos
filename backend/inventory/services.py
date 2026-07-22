"""Business logic for inventory operations."""
import uuid

from inventory.models import Inventory, InventoryTransaction, Product


def create_product(store_id: uuid.UUID, data: dict) -> Product:
    """Create a product and its initial inventory record."""
    initial_quantity = data.pop("initial_quantity", 0)

    product = Product.objects.create(store_id=store_id, **data)

    Inventory.objects.create(product=product, quantity=initial_quantity)

    return product


def adjust_inventory(
    store_id: uuid.UUID,
    product_id: uuid.UUID,
    delta: int,
    source: str = "manual",
    note: str | None = None,
    agent_run_id: uuid.UUID | None = None,
) -> InventoryTransaction:
    """Adjust inventory quantity and record the transaction."""
    inv, created = Inventory.objects.get_or_create(
        product_id=product_id,
        defaults={"quantity": 0},
    )

    inv.quantity = max(0, inv.quantity + delta)
    inv.save()

    tx = InventoryTransaction.objects.create(
        store_id=store_id,
        product_id=product_id,
        delta=delta,
        quantity_after=inv.quantity,
        source=source,
        note=note,
        agent_run_id=agent_run_id,
    )

    return tx
