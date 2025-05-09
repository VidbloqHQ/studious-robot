import { useState, useRef, useEffect } from 'react';
import { SelectOption } from '../../types';

type ImageSelectProps = {
  options: SelectOption[];
  value: SelectOption | null;
  onChange: (option: SelectOption) => void;
  placeholder?: string;
  className?: string;
};

const ImageSelect = ({
  options,
  value,
  onChange,
  placeholder = 'Select an option',
  className = '',
}: ImageSelectProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSelect = (option: SelectOption) => {
    onChange(option);
    setIsOpen(false);
  };

  return (
    <div 
      ref={selectRef} 
      className={`relative w-full ${className}`}
    >
      {/* Selected option display */}
      <div
        className="flex items-center justify-between p-2 border border-primary rounded-xl cursor-pointer bg-[var(--sdk-bg-primary-color)] text-text-secondary"
        onClick={() => setIsOpen(!isOpen)}
      >
        {value ? (
          <div className="flex items-center">
            {value.imageUrl && (
              <img
                src={value.imageUrl}
                alt={value.label}
                className="w-6 h-6 mr-2 object-cover rounded"
              />
            )}
            {value.svgIcon && (
              <div className="w-6 h-6 mr-2 flex items-center justify-center">
                {value.svgIcon}
              </div>
            )}
            <span>{value.label}</span>
          </div>
        ) : (
          <span className="text-text-secondary">{placeholder}</span>
        )}
        
        {/* Dropdown arrow */}
        <svg
          className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'transform rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </div>

      {/* Dropdown options */}
      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-[var(--sdk-bg-primary-color)] border border-primary rounded shadow-lg max-h-60 overflow-y-auto text-text-secondary">
          {options.map((option) => (
            <div
              key={option.value}
              className={`flex items-center p-1.5 cursor-pointer`}
              onClick={() => handleSelect(option)}
            >
              {option.imageUrl && (
                <img
                  src={option.imageUrl}
                  alt={option.label}
                  className="w-6 h-6 mr-2 object-cover rounded"
                />
              )}
              {option.svgIcon && (
                <div className="w-6 h-6 mr-2 flex items-center justify-center">
                  {option.svgIcon}
                </div>
              )}
              <span>{option.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ImageSelect;