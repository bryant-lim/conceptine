// Forms Logic and Submission Handler

// CONFIGURATION: Replace this URL with your published Google Apps Script Web App URL
const GOOGLE_SCRIPT_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbz7j5kb56TF_xpQiMDbCVI_jpmIxI46fRBV2_JX-nEnlRfTLP9F6fKImWK8Q18QCO68/exec";

document.addEventListener("DOMContentLoaded", () => {
  // 1. DYNAMIC COUNTRY PHONE CODE PREFIX POPULATION
  const countryCallingCodes = {
    "Malaysia": "+60 ",
    "Singapore": "+65 ",
    "Myanmar": "+95 ",
    "Cambodia": "+855 "
  };

  function setupPhonePrefixPopulation(countryId, phoneId, faxId = null) {
    const selector = document.getElementById(countryId);
    const phone = document.getElementById(phoneId);
    const fax = faxId ? document.getElementById(faxId) : null;

    if (selector && phone) {
      selector.addEventListener("change", (e) => {
        const selectedCountry = e.target.value;
        const prefix = countryCallingCodes[selectedCountry] || "";

        // Only set prefix if user hasn't already entered data or if it's currently matching an old prefix
        if (!phone.value || Object.values(countryCallingCodes).some(code => phone.value.trim() === code.trim())) {
          phone.value = prefix;
        }

        if (fax) {
          if (!fax.value || Object.values(countryCallingCodes).some(code => fax.value.trim() === code.trim())) {
            fax.value = prefix;
          }
        }
      });
    }
  }

  // Hook dynamic calling code prefixing for both forms
  setupPhonePrefixPopulation("country", "phone");
  setupPhonePrefixPopulation("dealer-country", "dealer-phone", "dealer-fax");

  // 1b. REAL-TIME EMAIL FORMAT VALIDATION ON BLUR
  const emailInputs = document.querySelectorAll('input[type="email"]');
  emailInputs.forEach(emailInput => {
    emailInput.addEventListener("blur", () => {
      const formGroup = emailInput.closest(".form-group");
      if (formGroup) {
        const value = emailInput.value.trim();
        // If empty, let the required check handle it. If not empty, check the format.
        if (value !== "") {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(value)) {
            formGroup.classList.add("invalid");
          } else {
            formGroup.classList.remove("invalid");
          }
        }
      }
    });
  });

  // 2. CONTACT US FORM SUBMISSION
  const contactForm = document.getElementById("contact-us-form");
  if (contactForm) {
    contactForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      // Honeypot spam check (form_midname field is hidden by CSS. If populated, it is a bot)
      const honeypot = document.getElementById("form_midname");
      if (honeypot && honeypot.value !== "") {
        console.warn("Spam submission blocked via Honeypot trap.");
        showSubmissionStatus("contact-us-form", true); // Silently simulate success to the bot
        return;
      }

      if (!validateForm(contactForm)) {
        return;
      }

      // Collect data
      const formData = {
        formType: "Contact Us",
        companyName: document.getElementById("companyName").value.trim(),
        name: document.getElementById("name").value.trim(),
        position: document.getElementById("position").value.trim(),
        email: document.getElementById("email").value.trim(),
        phone: document.getElementById("phone").value.trim(),
        country: document.getElementById("country").value,
        description: document.getElementById("description").value.trim(),
        privacyConsent: document.getElementById("privacy-consent").checked ? "Yes" : "No"
      };

      await submitFormData(contactForm, formData);
    });
  }

  // 3. DEALER APPLICATION FORM SUBMISSION
  const dealerForm = document.getElementById("dealer-application-form");
  if (dealerForm) {
    dealerForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      // Honeypot spam check (form_altemail field is hidden by CSS. If populated, it is a bot)
      const honeypot = document.getElementById("form_altemail");
      if (honeypot && honeypot.value !== "") {
        console.warn("Spam submission blocked via Honeypot trap.");
        showSubmissionStatus("dealer-application-form", true); // Silently simulate success
        return;
      }

      // Special validation for technologies checklist
      const techCheckboxes = document.querySelectorAll('input[name="tech_interest"]:checked');
      const techError = document.querySelector(".tech-error");

      let isTechValid = true;
      if (techCheckboxes.length === 0) {
        isTechValid = false;
        if (techError) techError.style.display = "block";
      } else {
        if (techError) techError.style.display = "none";
      }

      if (!validateForm(dealerForm) || !isTechValid) {
        return;
      }

      // Collect technologies checklist values
      const techList = [];
      techCheckboxes.forEach(cb => techList.push(cb.value));

      // Collect data
      const formData = {
        formType: "Become a Dealer",
        // Partner Contact
        country: document.getElementById("dealer-country").value,
        name: document.getElementById("dealer-name").value.trim(),
        position: document.getElementById("dealer-position").value.trim(),
        email: document.getElementById("dealer-email").value.trim(),
        phone: document.getElementById("dealer-phone").value.trim(),
        fax: document.getElementById("dealer-fax").value.trim(),
        // Company Information
        companyName: document.getElementById("dealer-company-name").value.trim(),
        companyWebsite: document.getElementById("dealer-company-website").value.trim(),
        address1: document.getElementById("dealer-address1").value.trim(),
        address2: document.getElementById("dealer-address2").value.trim(),
        city: document.getElementById("dealer-city").value.trim(),
        state: document.getElementById("dealer-state").value.trim(),
        postcode: document.getElementById("dealer-postcode").value.trim(),
        employees: document.getElementById("dealer-employees").value,
        yearsInBusiness: document.getElementById("dealer-years").value,
        revenueGoal: document.getElementById("dealer-revenue").value.trim(),
        topVendors: document.getElementById("dealer-vendors").value.trim(),
        hasTechDataAccount: document.getElementById("dealer-techdata").value,
        technologiesOfInterest: techList,
        privacyConsent: document.getElementById("privacy-consent").checked ? "Yes" : "No"
      };

      await submitFormData(dealerForm, formData);
    });
  }

  // 4. CLIENT-SIDE VALIDATION HELPERS
  function validateForm(form) {
    let isValid = true;
    const requiredInputs = form.querySelectorAll("[required]");

    requiredInputs.forEach(input => {
      const formGroup = input.closest(".form-group");

      // Validation checks
      let isFieldValid = true;
      if (input.type === "email") {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        isFieldValid = emailRegex.test(input.value.trim());
      } else if (input.type === "checkbox") {
        isFieldValid = input.checked;
      } else if (input.tagName === "SELECT") {
        isFieldValid = input.value !== "";
      } else {
        isFieldValid = input.value.trim() !== "";
      }

      if (!isFieldValid) {
        isValid = false;
        if (formGroup) {
          formGroup.classList.add("invalid");
        }
      } else {
        if (formGroup) {
          formGroup.classList.remove("invalid");
        }
      }

      // Remove validation error on user typing/selection
      input.addEventListener("input", () => {
        if (formGroup) formGroup.classList.remove("invalid");
      });
      if (input.tagName === "SELECT" || input.type === "checkbox") {
        input.addEventListener("change", () => {
          if (formGroup) formGroup.classList.remove("invalid");
        });
      }
    });

    return isValid;
  }

  // 5. AJAX FORM SUBMISSION TRIGGER
  async function submitFormData(form, data) {
    const submitBtn = form.querySelector('button[type="submit"]');
    const btnText = submitBtn.querySelector(".btn-text");
    const spinner = submitBtn.querySelector(".spinner");

    // Start loading state
    submitBtn.disabled = true;
    if (btnText) btnText.style.display = "none";
    if (spinner) spinner.style.display = "inline-block";

    try {
      // If default URL is not configured yet, log a warning but still handle it gracefully
      if (GOOGLE_SCRIPT_WEB_APP_URL.includes("_placeholder")) {
        console.warn("Forms Web App URL is still placeholder. Please set your URL.");
        // Simulate a successful local fallback for preview purposes
        setTimeout(() => {
          finishLoading();
          showSubmissionStatus(form.id, true);
        }, 1200);
        return;
      }

      const response = await fetch(GOOGLE_SCRIPT_WEB_APP_URL, {
        method: "POST",
        mode: "no-cors", // Use no-cors since Google Script handles requests securely but redirects
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
      });

      // Under no-cors, response will be opaque. We assume success unless an exception is caught.
      finishLoading();
      showSubmissionStatus(form.id, true);
      form.reset();

    } catch (error) {
      console.error("Submission failed:", error);
      finishLoading();
      showSubmissionStatus(form.id, false);
    }

    function finishLoading() {
      submitBtn.disabled = false;
      if (btnText) btnText.style.display = "inline-block";
      if (spinner) spinner.style.display = "none";
    }
  }

  // 6. TOGGLE STATUS UI ALERTS
  function showSubmissionStatus(formId, isSuccess) {
    const successAlert = document.getElementById("success-alert");
    const errorAlert = document.getElementById("error-alert");

    if (isSuccess) {
      if (successAlert) successAlert.style.display = "block";
      if (errorAlert) errorAlert.style.display = "none";
      // Auto-scroll to status banner
      const statusAlert = successAlert || errorAlert;
      statusAlert.scrollIntoView({ behavior: "smooth", block: "center" });
    } else {
      if (errorAlert) errorAlert.style.display = "block";
      if (successAlert) successAlert.style.display = "none";
      const statusAlert = errorAlert || successAlert;
      statusAlert.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }
});
