import { useEffect, useState } from "react";
import { Modal } from "../base/index";
import { Participant } from "../../types/index";
import { useNotification, useTransaction, useRequirePublicKey } from "../../hooks/index";
import { getTokenBalance } from "../../utils/index";
import { Icon } from "../icons";
import AmountSlider from "../amount-slider";

type SendModalProps = {
  selectedUser: Participant | null;
  closeFunc: (val: boolean) => void;
};

const SendModal = ({ selectedUser, closeFunc }: SendModalProps) => {
  const [tokenAmount, setTokenAmount] = useState<number>();
  const [loading, setLoading] = useState<boolean>(false);
  const [isTransactionFetched, setIsTransactionFetched] =
    useState<boolean>(false);
  const [balance, setBalance] = useState<number>(0);
  const { publicKey } = useRequirePublicKey()

  console.log({ balance });
  const handleAmountChange = (amount: number) => {
    setTokenAmount(amount);
  };
  const getUsdcBalance = async () => {
    if (!selectedUser || !publicKey) {
      return;
    }
    const balance = await getTokenBalance(publicKey.toString());
    setBalance(balance.onChainBalance.usdc);
  };
  useEffect(() => {
    getUsdcBalance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUser]);

  const recipients = selectedUser
    ? [
        {
          publicKey: selectedUser.walletAddress,
          amount: Number(tokenAmount),
        },
      ]
    : [];

  const { addNotification } = useNotification();
  const {
    fetchTransaction,
    signAndSubmitTransaction,
    transactionBase64,
    transactionSignature,
    error,
    loading: transactionLoading,
  } = useTransaction({
    recipients,
  });

  useEffect(() => {
    const handleTransactionSign = async () => {
      if (transactionBase64 && isTransactionFetched) {
        try {
          await signAndSubmitTransaction();
          // Only handle success here - errors are handled in the catch block
          if (transactionSignature) {
            addNotification({
              type: "success",
              message: "Transaction completed successfully",
              duration: 3000,
            });
            // closeFunc(false);
          }
        } catch (error) {
          console.error("Error in signing transaction:", error);
          addNotification({
            type: "error",
            message:
              error instanceof Error
                ? error.message
                : "Failed to sign and submit the transaction",
            duration: 3000,
          });
        } finally {
          setIsTransactionFetched(false);
          setLoading(false);
        }
      }
    };

    handleTransactionSign();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactionBase64, isTransactionFetched]);

  const sendToken = async () => {
    if (!tokenAmount || tokenAmount <= 0) {
      addNotification({
        type: "error",
        message: "Please enter a valid amount",
        duration: 3000,
      });
      return;
    }

    if (tokenAmount > balance) {
      addNotification({
        type: "error",
        message: "Amount exceeds available balance",
        duration: 3000,
      });
      return;
    }

    try {
      setLoading(true);
      await fetchTransaction();
      setIsTransactionFetched(true);
    } catch (error) {
      console.error("Error in sendToken:", error);
      addNotification({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to fetch transaction",
        duration: 3000,
      });
      setLoading(false);
    }
  };
  return (
    <Modal
      onClose={() => closeFunc(true)}
      childClassName="bg-[var(--sdk-bg-primary-color)] h-[40%] w-[86%] lg:w-[25%] rounded-xl overflow-y-scroll"
      isClosable={false}
    >
      <div
        className="bg-[var(--sdk-bg-primary-color)] p-1.5 absolute -top-1.5 -right-1.5 rounded-full cursor-pointer"
        onClick={() => closeFunc(true)}
      >
        <Icon name="close" size={11} className="text-primary" />
      </div>
      <div className="p-4 h-full">
        <div className="flex flex-row justify-between">
          <div className="flex flex-row items-center text-text-secondary">
            <p className="mr-2 capitalize">{selectedUser?.userName} </p>
            <Icon name="arrow" className="rotate-180" size={12} />
          </div>
          <div className="flex flex-row items-center gap-x-1">
            <p className="text-2xl font-bold">{balance}</p>
            <span className="text-xs uppercase font-bold">usdc</span>
          </div>
        </div>

        <AmountSlider
          maxAmount={balance}
          onAmountChange={handleAmountChange}
          initialAmount={0}
        />

        <div className="w-[52%] lg:w-[50%] mx-auto text-text-primary">
          <button
            onClick={sendToken}
            disabled={loading || transactionLoading}
            className="bg-primary py-3.5 lg:py-3 rounded-full w-full text-sm text-text-primary"
          >
            Send
          </button>
        </div>
        {error && (
          <p className="text-wrap text-sm text-danger">Error: {error}</p>
        )}
        {transactionSignature && (
          <div className="text-sm text-wrap w-[80%]">
            <p>Transaction Signature:</p>
            <a
              href={`https://explorer.solana.com/tx/${transactionSignature}?cluster=mainnet`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-light hover:text-primary-dark break-all"
            >
              {transactionSignature}
            </a>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default SendModal;
