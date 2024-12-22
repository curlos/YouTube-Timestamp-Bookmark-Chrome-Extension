export const createCustomRadioButton = ({
	label,
	name,
	checked,
	onChange,
	customLabelClass = '',
	customOuterCircleClasses = '',
	customInnerCircleClasses = '',
	customOuterCircleBorderColorClasses = '',
	customInnerCircleBgColorClasses = '',
}) => {
	// Create label
	const labelElement = document.createElement('label');
	labelElement.className = `radio-label ${customLabelClass}`;

	// Create hidden input
	const inputElement = document.createElement('input');
	inputElement.type = 'radio';
	inputElement.name = name;
	inputElement.checked = checked;
	inputElement.className = 'radio-input';
	inputElement.addEventListener('change', onChange);

	// Create outer circle
	const outerCircle = document.createElement('div');
	outerCircle.className = `radio-outer-circle ${customOuterCircleClasses} ${
		customOuterCircleBorderColorClasses || 'border-color-gray-100'
	}`;

	// Create inner circle (if checked)
	if (checked) {
		const innerCircle = document.createElement('div');
		innerCircle.className = `radio-inner-circle ${customInnerCircleClasses} ${
			customInnerCircleBgColorClasses || 'bg-color-gray-100'
		}`;
		outerCircle.appendChild(innerCircle);
	}

	// Append children to label
	labelElement.appendChild(inputElement);
	labelElement.appendChild(outerCircle);
	labelElement.appendChild(document.createTextNode(label));

	return labelElement;
}