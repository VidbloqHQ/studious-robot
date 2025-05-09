import { useEffect, useState } from "react";
import { ImageSelect, Modal } from "../base/index";
import { SelectOption, Participant } from "../../types/index";
import { useNotification, useTransaction } from "../../hooks/index";
import { Icon } from "../icons";

type SendModalProps = {
  selectedUser: Participant | null;
  closeFunc: (val: boolean) => void;
};

const SendModal = ({ selectedUser, closeFunc }: SendModalProps) => {
  const [token, setToken] = useState<SelectOption | null>(null);
  const [tokenAmount, setTokenAmount] = useState<string>();
  const [loading, setLoading] = useState<boolean>(false);
  const [isTransactionFetched, setIsTransactionFetched] =
    useState<boolean>(false);
  console.log(token);
  const options = [
    {
      value: "usdc",
      label: "Usdc",
      svgIcon: <Icon name="usdc" size={20} />,
    },
    {
      value: "sol",
      label: "Sol",
      svgIcon: <Icon name="sol" size={20} />,
    },
  ];

  const recipients = selectedUser
    ? [
        {
          publicKey: selectedUser.walletAddress,
          amount: Number(tokenAmount),
        },
      ]
    : [];

  const handleAmountChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setTokenAmount(event.target.value);
    setIsTransactionFetched(false); // Reset when amount changes
  };
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
    if (!token || !tokenAmount) {
      addNotification({
        type: "error",
        message: "Token name and amount is required",
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
      childClassName="bg-[var(--sdk-bg-primary-color)] h-[35%] w-[86%] lg:w-[25%] rounded-xl"
      isClosable={false}
    >
      <div
        className="bg-[var(--sdk-bg-primary-color)] p-1.5 absolute -top-1.5 -right-1.5 rounded-full cursor-pointer"
        onClick={() => closeFunc(true)}
      >
        <Icon
          name="close"
          size={11}
          className="text-primary"
        />
      </div>
      <div className="p-4">
        <div className="flex flex-row items-center text-text-secondary">
          <p className="mr-2 capitalize">{selectedUser?.userName} </p>
          <Icon name="arrow" className="rotate-180" size={12} />
        </div>

        <div className="my-4 flex flex-row items-center justify-between w-full gap-1.5">
          <ImageSelect
            value={token}
            onChange={setToken}
            options={options}
            placeholder="Select token"
          />
          <input
            type="text"
            className="rounded-xl focus:outline-none border border-primary bg-[var(--sdk-bg-primary-color)] text-sm w-full p-2.5 text-text-secondary"
            placeholder="Amount"
            value={tokenAmount}
            onChange={handleAmountChange}
          />
        </div>

        <div className="w-[52%] lg:w-[50%] mx-auto text-text-primary">
          <button
            onClick={sendToken}
            disabled={loading || transactionLoading}
            className="bg-primary py-3.5 lg:py-3 rounded-full w-full text-sm"
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
              href={`https://explorer.solana.com/tx/${transactionSignature}?cluster=devnet`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 break-all"
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
