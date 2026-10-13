"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IsStrongPassword = IsStrongPassword;
const class_validator_1 = require("class-validator");
function IsStrongPassword(validationOptions) {
    return function (object, propertyName) {
        (0, class_validator_1.registerDecorator)({
            name: 'isStrongPassword',
            target: object.constructor,
            propertyName,
            options: {
                message: 'password must be at least 8 characters and include an uppercase letter, a lowercase letter, a number, and a symbol',
                ...validationOptions,
            },
            validator: {
                validate(value) {
                    if (typeof value !== 'string')
                        return false;
                    const hasUpper = /[A-Z]/.test(value);
                    const hasLower = /[a-z]/.test(value);
                    const hasNumber = /[0-9]/.test(value);
                    const hasSymbol = /[^A-Za-z0-9]/.test(value);
                    return value.length >= 8 && hasUpper && hasLower && hasNumber && hasSymbol;
                },
            },
        });
    };
}
//# sourceMappingURL=strong-password.validator.js.map