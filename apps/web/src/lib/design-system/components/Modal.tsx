"use client";

import {
  Dialog,
  DialogTrigger,
  DialogBackdrop,
  DialogPositioner,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
  DialogCloseTrigger,
  Button,
  Box,
} from "@chakra-ui/react";
import type { ReactNode } from "react";
import { forwardRef } from "react";

interface ModalProps {
  title: string;
  description?: string;
  children: ReactNode;
  actionButtons?: ReactNode;
  isOpen: boolean;
  onClose: () => void;
  size?: "sm" | "md" | "lg" | "xl" | "full";
}

const sizeMap = {
  sm: "360px",
  md: "480px",
  lg: "640px",
  xl: "800px",
  full: "90vw",
} as const;

const Modal = forwardRef<HTMLDivElement, ModalProps>(
  (
    {
      title,
      description,
      children,
      actionButtons,
      isOpen,
      onClose,
      size = "md",
    },
    ref
  ) => {
    if (!isOpen) return null;

    return (
      <Dialog.Root open={isOpen} onOpenChange={onClose}>
        <DialogTrigger asChild>
          <Box css={{ display: "none" }} />
        </DialogTrigger>
        <DialogBackdrop
          css={{
            bg: "rgba(15, 23, 42, 0.6)",
            animation: "fadeIn 0.2s ease",
          }}
        />
        <DialogPositioner>
          <DialogContent
            ref={ref as React.Ref<HTMLDivElement>}
            css={{
              maxW: sizeMap[size],
              borderRadius: "xl", border: "1px solid", borderColor: "surface.border",
              boxShadow: "lg",
              bg: "surface.primary",
            }}
          >
            <DialogCloseTrigger
              css={{
                position: "absolute",
                top: 4,
                right: 4,
                zIndex: 1,
              }}
              aria-label="Fechar modal"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </DialogCloseTrigger>
            <DialogHeader px={6} py={5} borderBottom="1px solid" borderColor="surface.border">
              <DialogTitle css={{ fontSize: "xl", fontWeight: "semibold", color: "text.primary" }}>
                {title}
              </DialogTitle>
              {description && (
                <DialogDescription css={{ fontSize: "sm", color: "text.tertiary", mt: 2 }}>
                  {description}
                </DialogDescription>
              )}
            </DialogHeader>
            <DialogBody px={6} py={5}>
              {children}
            </DialogBody>
            {actionButtons && (
              <DialogFooter
                px={6}
                py={4}
                borderTop="1px solid"
                borderColor="surface.border"
                justifyContent="flex-end"
              >
                {actionButtons}
              </DialogFooter>
            )}
          </DialogContent>
        </DialogPositioner>
      </Dialog.Root>
    );
  }
);

Modal.displayName = "Modal";

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "primary";
  isLoading?: boolean;
}

const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  variant = "primary",
  isLoading,
}: ConfirmDialogProps) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={message}
      size="sm"
      actionButtons={
        <>
          <Button variant="ghost" size="sm" onClick={onClose} loading={isLoading}>
            {cancelLabel}
          </Button>
          <Button
            variant="solid"
            colorScheme={variant === "danger" ? "red" : "brand"}
            size="sm"
            onClick={onConfirm}
            loading={isLoading}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <Box>{message}</Box>
    </Modal>
  );
};

export { Modal, type ModalProps, ConfirmDialog, type ConfirmDialogProps };
