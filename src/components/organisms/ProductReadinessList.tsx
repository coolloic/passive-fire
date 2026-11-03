import { ReadinessBadge } from "@/components/atoms/ReadinessBadge";
import type { ProductDetail } from "@/lib/services/planned-work-detail";

interface ProductReadinessListProps {
  products: readonly ProductDetail[];
}

const unitSuffix = (unit: ProductDetail["unit"]) => (unit === "metre" ? " m" : "");

/** Products the planned work needs, with what is allocated and what is short. Stacks on phones. */
export function ProductReadinessList({ products }: ProductReadinessListProps) {
  if (products.length === 0) {
    return <p className="text-base">No product quantities are known for this work.</p>;
  }
  return (
    <ul className="flex flex-col gap-3">
      {products.map((product) => {
        const suffix = unitSuffix(product.unit);
        return (
          <li
            key={product.productId}
            className="flex flex-col gap-2 rounded-lg border border-neutral-200 p-4 dark:border-neutral-700"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h3 className="text-base font-medium">{product.name}</h3>
              <ReadinessBadge state={product.state} />
            </div>
            <dl className="grid grid-cols-3 gap-2 text-base">
              <div>
                <dt className="text-sm text-neutral-600 dark:text-neutral-400">Needed</dt>
                <dd className="font-medium">
                  {product.needed}
                  {suffix}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-neutral-600 dark:text-neutral-400">Allocated</dt>
                <dd className="font-medium">
                  {product.allocated}
                  {suffix}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-neutral-600 dark:text-neutral-400">Short</dt>
                <dd
                  className={
                    product.short > 0
                      ? "font-semibold text-red-800 dark:text-red-200"
                      : "font-medium"
                  }
                >
                  {product.short}
                  {suffix}
                </dd>
              </div>
            </dl>
            {product.notes.length > 0 ? (
              <ul className="list-disc pl-5 text-base">
                {product.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
