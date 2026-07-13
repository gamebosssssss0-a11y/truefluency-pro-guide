// 20 sample multiple-choice questions used for every mock test flow (UI-only).
// Each has a topic label so we can surface a topic breakdown after submission.

export type MCQ = {
  id: number;
  topic: string;
  question: string;
  options: string[];
  correctIndex: number;
};

export const sampleQuestions: MCQ[] = [
  { id: 1, topic: "Descriptive Statistics", question: "The mean of 4, 8, 6, 5, 3 is:", options: ["5.2", "5.0", "4.8", "6.0"], correctIndex: 0 },
  { id: 2, topic: "Descriptive Statistics", question: "Which measure of central tendency is most affected by extreme values?", options: ["Median", "Mode", "Mean", "Range"], correctIndex: 2 },
  { id: 3, topic: "Probability", question: "Two coins are tossed. P(both heads) =", options: ["1/2", "1/3", "1/4", "1/6"], correctIndex: 2 },
  { id: 4, topic: "Probability", question: "Events A and B are independent iff:", options: ["P(A∩B)=P(A)P(B)", "P(A∪B)=P(A)+P(B)", "P(A|B)=P(B)", "P(A)=P(B)"], correctIndex: 0 },
  { id: 5, topic: "Sampling Theory", question: "In simple random sampling, every unit has:", options: ["Different probability", "Equal probability of selection", "No chance", "A ranked probability"], correctIndex: 1 },
  { id: 6, topic: "Sampling Theory", question: "Stratified sampling is preferred when:", options: ["Population is homogeneous", "Population is heterogeneous", "Sample is tiny", "There is no frame"], correctIndex: 1 },
  { id: 7, topic: "Regression", question: "The slope of a regression line indicates:", options: ["Correlation coefficient", "Rate of change of Y with X", "Standard error", "Sample size"], correctIndex: 1 },
  { id: 8, topic: "Regression", question: "R² close to 1 suggests:", options: ["Poor fit", "Perfect fit", "Random data", "No relationship"], correctIndex: 1 },
  { id: 9, topic: "Hypothesis Testing", question: "A p-value < 0.05 typically leads us to:", options: ["Accept H0", "Reject H0", "Ignore the data", "Redo the study"], correctIndex: 1 },
  { id: 10, topic: "Hypothesis Testing", question: "Type I error is:", options: ["Rejecting a true H0", "Accepting a false H0", "Sampling bias", "A rounding issue"], correctIndex: 0 },
  { id: 11, topic: "Distributions", question: "The standard normal has mean and variance:", options: ["0 and 0", "1 and 0", "0 and 1", "1 and 1"], correctIndex: 2 },
  { id: 12, topic: "Distributions", question: "The Poisson distribution models:", options: ["Continuous measurements", "Rare event counts", "Two-category outcomes", "Ranked data"], correctIndex: 1 },
  { id: 13, topic: "Time Series", question: "A trend refers to:", options: ["Random noise", "Long-term movement", "Seasonal spike", "Missing values"], correctIndex: 1 },
  { id: 14, topic: "Time Series", question: "Which is a seasonal component?", options: ["Yearly inflation", "Monthly retail sales pattern", "Random shocks", "One-time event"], correctIndex: 1 },
  { id: 15, topic: "Computing", question: "In R, which function fits a linear model?", options: ["mean()", "lm()", "sd()", "plot()"], correctIndex: 1 },
  { id: 16, topic: "Computing", question: "SQL keyword to filter grouped rows:", options: ["WHERE", "HAVING", "GROUP", "ORDER"], correctIndex: 1 },
  { id: 17, topic: "Design of Experiments", question: "Blocking is used to:", options: ["Reduce variability from nuisance factors", "Increase noise", "Randomize wildly", "Remove data"], correctIndex: 0 },
  { id: 18, topic: "Design of Experiments", question: "A completely randomized design assumes:", options: ["Homogeneous units", "Ordered treatments", "Stratified units", "No replication"], correctIndex: 0 },
  { id: 19, topic: "Inference", question: "Confidence intervals communicate:", options: ["Point estimate only", "Uncertainty in the estimate", "Sample identity", "Errors in coding"], correctIndex: 1 },
  { id: 20, topic: "Inference", question: "Central Limit Theorem says sample means become approximately:", options: ["Uniform", "Skewed", "Normal for large n", "Bimodal"], correctIndex: 2 },
];
