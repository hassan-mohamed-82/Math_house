export const isEquivalentGridInAnswer = (studentAnswer: string, correctAnswer: string): boolean => {
    const sAns = studentAnswer.trim().toLowerCase();
    const cAns = correctAnswer.trim().toLowerCase();

    if (sAns === cAns) return true;

    const parseNumber = (str: string): number | null => {
        if (!str) return null;
        if (str.includes('/')) {
            const parts = str.split('/');
            if (parts.length === 2) {
                const num = parseFloat(parts[0]);
                const den = parseFloat(parts[1]);
                if (!isNaN(num) && !isNaN(den) && den !== 0) {
                    return num / den;
                }
            }
        } else {
            const num = parseFloat(str);
            if (!isNaN(num)) return num;
        }
        return null;
    };

    const sNum = parseNumber(sAns);
    const cNum = parseNumber(cAns);

    if (sNum !== null && cNum !== null) {
        if (sNum === cNum) return true;

        const sDecimals = sAns.includes('.') ? sAns.split('.')[1].length : 0;
        
        if (sDecimals >= 1) {
            const factor = Math.pow(10, sDecimals);
            const roundedCNum = Math.round(cNum * factor) / factor;
            const truncatedCNum = Math.trunc(cNum * factor) / factor;

            if (sNum === roundedCNum || sNum === truncatedCNum) {
                return true;
            }
        }
    }

    return false;
};
