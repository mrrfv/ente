import { ButtonBase, Snackbar } from "@mui/material";
import { t } from "i18next";
import { HOTP, TOTP } from "otpauth";
import { useEffect, useState } from "react";
import { Code } from "types/code";

const TOTPDisplay = ({ issuer, account, code, nextCode, period }) => {
    return (
        <div
            style={{
                backgroundColor: "rgba(40, 40, 40, 0.6)",
                borderRadius: "4px",
                overflow: "hidden",
            }}
        >
            <TimerProgress period={period ?? Code.defaultPeriod} />
            <div
                style={{
                    padding: "12px 20px 0px 20px",
                    display: "flex",
                    alignItems: "flex-start",
                    minWidth: "320px",
                    minHeight: "120px",
                    justifyContent: "space-between",
                }}
            >
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-start",
                        minWidth: "200px",
                    }}
                >
                    <p
                        style={{
                            fontWeight: "bold",
                            margin: "0px",
                            fontSize: "14px",
                            textAlign: "left",
                        }}
                    >
                        {issuer}
                    </p>
                    <p
                        style={{
                            marginTop: "0px",
                            marginBottom: "8px",
                            textAlign: "left",
                            fontSize: "12px",
                            maxWidth: "200px",
                            minHeight: "16px",
                            color: "grey",
                        }}
                    >
                        {account}
                    </p>
                    <p
                        style={{
                            margin: "0px",
                            marginBottom: "1rem",
                            fontSize: "24px",
                            fontWeight: "bold",
                            textAlign: "left",
                        }}
                    >
                        {code}
                    </p>
                </div>
                <div style={{ flex: 1 }} />
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-end",
                        minWidth: "120px",
                        textAlign: "right",
                        marginTop: "auto",
                        marginBottom: "1rem",
                    }}
                >
                    <p
                        style={{
                            fontWeight: "bold",
                            marginBottom: "0px",
                            fontSize: "10px",
                            marginTop: "auto",
                            textAlign: "right",
                            color: "grey",
                        }}
                    >
                        {t("AUTH_NEXT")}
                    </p>
                    <p
                        style={{
                            fontSize: "14px",
                            fontWeight: "bold",
                            marginBottom: "0px",
                            marginTop: "auto",
                            textAlign: "right",
                            color: "grey",
                        }}
                    >
                        {nextCode}
                    </p>
                </div>
            </div>
        </div>
    );
};

function BadCodeInfo({ codeInfo, codeErr }) {
    const [showRawData, setShowRawData] = useState(false);

    return (
        <div className="code-info">
            <div>{codeInfo.title}</div>
            <div>{codeErr}</div>
            <div>
                {showRawData ? (
                    <div onClick={() => setShowRawData(false)}>
                        {codeInfo.rawData ?? "no raw data"}
                    </div>
                ) : (
                    <div onClick={() => setShowRawData(true)}>Show rawData</div>
                )}
            </div>
        </div>
    );
}

interface OTPDisplayProps {
    codeInfo: Code;
}

const OTPDisplay = (props: OTPDisplayProps) => {
    const { codeInfo } = props;
    const [code, setCode] = useState("");
    const [nextCode, setNextCode] = useState("");
    const [codeErr, setCodeErr] = useState("");
    const [hasCopied, setHasCopied] = useState(false);

    const generateCodes = () => {
        try {
            const currentTime = new Date().getTime();
            if (codeInfo.type.toLowerCase() === "totp") {
                const totp = new TOTP({
                    secret: codeInfo.secret,
                    algorithm: codeInfo.algorithm ?? Code.defaultAlgo,
                    period: codeInfo.period ?? Code.defaultPeriod,
                    digits: codeInfo.digits ?? Code.defaultDigits,
                });
                setCode(totp.generate());
                setNextCode(
                    totp.generate({
                        timestamp: currentTime + codeInfo.period * 1000,
                    }),
                );
            } else if (codeInfo.type.toLowerCase() === "hotp") {
                const hotp = new HOTP({
                    secret: codeInfo.secret,
                    counter: 0,
                    algorithm: codeInfo.algorithm,
                });
                setCode(hotp.generate());
                setNextCode(hotp.generate({ counter: 1 }));
            }
        } catch (err) {
            setCodeErr(err.message);
        }
    };

    const copyCode = () => {
        navigator.clipboard.writeText(code);
        setHasCopied(true);
        setTimeout(() => {
            setHasCopied(false);
        }, 2000);
    };

    useEffect(() => {
        // this is to set the initial code and nextCode on component mount
        generateCodes();
        const codeType = codeInfo.type;
        const codePeriodInMs = codeInfo.period * 1000;
        const timeToNextCode =
            codePeriodInMs - (new Date().getTime() % codePeriodInMs);
        const intervalId = null;
        // wait until we are at the start of the next code period,
        // and then start the interval loop
        setTimeout(() => {
            // we need to call generateCodes() once before the interval loop
            // to set the initial code and nextCode
            generateCodes();
            codeType.toLowerCase() === "totp" ||
            codeType.toLowerCase() === "hotp"
                ? setInterval(() => {
                      generateCodes();
                  }, codePeriodInMs)
                : null;
        }, timeToNextCode);

        return () => {
            if (intervalId) clearInterval(intervalId);
        };
    }, [codeInfo]);

    return (
        <div style={{ padding: "8px" }}>
            {codeErr === "" ? (
                <ButtonBase
                    component="div"
                    onClick={() => {
                        copyCode();
                    }}
                >
                    <TOTPDisplay
                        period={codeInfo.period}
                        issuer={codeInfo.issuer}
                        account={codeInfo.account}
                        code={code}
                        nextCode={nextCode}
                    />
                    <Snackbar
                        open={hasCopied}
                        message="Code copied to clipboard"
                    />
                </ButtonBase>
            ) : (
                <BadCodeInfo codeInfo={codeInfo} codeErr={codeErr} />
            )}
        </div>
    );
};

export default OTPDisplay;

const TimerProgress = ({ period }) => {
    const [progress, setProgress] = useState(0);
    const [ticker, setTicker] = useState(null);
    const microSecondsInPeriod = period * 1000000;

    const startTicker = () => {
        const ticker = setInterval(() => {
            updateTimeRemaining();
        }, 10);
        setTicker(ticker);
    };

    const updateTimeRemaining = () => {
        const timeRemaining =
            microSecondsInPeriod -
            ((new Date().getTime() * 1000) % microSecondsInPeriod);
        setProgress(timeRemaining / microSecondsInPeriod);
    };

    useEffect(() => {
        startTicker();
        return () => clearInterval(ticker);
    }, []);

    const color = progress > 0.4 ? "green" : "orange";

    return (
        <div
            style={{
                borderTopLeftRadius: "3px",
                width: `${progress * 100}%`,
                height: "3px",
                backgroundColor: color,
            }}
        />
    );
};
