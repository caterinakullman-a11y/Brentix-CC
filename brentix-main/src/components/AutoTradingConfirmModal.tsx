import { AlertTriangle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface AutoTradingConfirmModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function AutoTradingConfirmModal({
  isOpen,
  onConfirm,
  onCancel,
}: AutoTradingConfirmModalProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <AlertDialogTitle className="text-xl">
              Aktivera Auto-Trading?
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-3">
            <p>
              Du är på väg att aktivera <strong className="text-destructive">automatisk handel</strong>. 
              Detta innebär att:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Brentix kommer automatiskt utföra trades på ditt Avanza-konto</li>
              <li>Ordrar placeras baserat på genererade signaler</li>
              <li>Riktiga pengar kommer användas om Live Trading är aktivt</li>
              <li>Du bör övervaka systemet regelbundet</li>
            </ul>
            <p className="font-medium pt-2">
              Är du säker på att du vill fortsätta?
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Avbryt</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Ja, aktivera Auto-Trading
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
