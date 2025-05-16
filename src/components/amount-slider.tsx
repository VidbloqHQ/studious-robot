import React from "react";

type AmountSliderProps = {
  maxAmount: number;
  onAmountChange: (amount: number) => void;
  initialAmount?: number;
};

const AmountSlider = ({ maxAmount, onAmountChange, initialAmount = 0 }: AmountSliderProps) => {
  const [amount, setAmount] = React.useState(initialAmount);
  const [isDragging, setIsDragging] = React.useState(false);
  const sliderRef = React.useRef<HTMLDivElement>(null);

  // Min and max values for the slider
  const min = 0; // Changed to 0 as requested
  const max = Math.max(maxAmount, 1); // Ensure max is at least 1 to avoid division by zero

  React.useEffect(() => {
    // Update amount when maxAmount changes but only if it's less than current amount
    if (amount > max) {
      setAmount(max);
      onAmountChange(max);
    }
  }, [max, amount, onAmountChange]);

  const handleMouseDown = (
    e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>
  ) => {
    setIsDragging(true);
    updateSliderValue(e);
    document.addEventListener("mousemove", handleMouseMove as EventListener);
    document.addEventListener("mouseup", handleMouseUp as EventListener);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      updateSliderValue(e);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  };

  const updateSliderValue = (
    e: MouseEvent | React.MouseEvent | React.TouchEvent
  ) => {
    if (sliderRef.current) {
      const rect = sliderRef.current.getBoundingClientRect();
      let clientX: number;
      if ("touches" in e && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
      } else if ("clientX" in e) {
        clientX = (e as MouseEvent | React.MouseEvent).clientX;
      } else {
        return;
      }
      const position = (clientX - rect.left) / rect.width;
      const newValue = Math.round(min + position * (max - min));
      const clampedValue = Math.max(min, Math.min(max, newValue));
      setAmount(clampedValue);
      onAmountChange(clampedValue);
    }
  };

  const getThumbPosition = () => {
    return max === min ? 0 : ((amount - min) / (max - min)) * 100;
  };

  return (
    <div>
      <div className="w-full max-w-md">
        {/* Amount Display */}
        <div className="text-center mb-6">
          <span className="text-3xl font-bold text-black dark:text-white">
            ${amount}{" "}
            <span className="text-gray-600 dark:text-gray-300 text-lg">
              USDC
            </span>
          </span>
        </div>

        {/* Slider Track */}
        <div
          ref={sliderRef}
          className="relative h-2 bg-gray-200 dark:bg-gray-700 rounded-full cursor-pointer mb-8"
          onClick={updateSliderValue}
        >
          {/* Filled Track */}
          <div
            className="absolute h-full bg-primary dark:bg-primary-dark rounded-full"
            style={{ width: `${getThumbPosition()}%` }}
          />

          {/* Thumb */}
          <div
            className="absolute w-6 h-6 bg-white border-4 border-primary dark:border-primary-dark rounded-full shadow-md cursor-grab active:cursor-grabbing"
            style={{
              left: `${getThumbPosition()}%`,
              top: "50%",
              transform: "translate(-50%, -50%)",
            }}
            onMouseDown={handleMouseDown}
            onTouchStart={handleMouseDown}
          />
        </div>
      </div>
    </div>
  );
};

export default AmountSlider;