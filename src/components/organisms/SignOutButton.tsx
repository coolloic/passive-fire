import { Button } from "@/components/atoms/Button";

interface SignOutButtonProps {
  action: () => Promise<void>;
}

export function SignOutButton({ action }: SignOutButtonProps) {
  return (
    <form action={action}>
      <Button type="submit" variant="secondary">
        Sign out
      </Button>
    </form>
  );
}
