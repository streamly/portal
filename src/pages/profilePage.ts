import $ from "jquery"
import "mdb-ui-kit/css/mdb.min.css"
import {
    checkIfUserHasCompleteProfile,
    getMissingProfileFields,
    getUserInfo,
    initAuth,
    isUserAuthenticated,
    startSignIn,
} from "../auth"
import { updateProfile } from "../services/profileService"

document.addEventListener("DOMContentLoaded", async () => {
    $("#loader").show()
    $("#profile-container").hide()

    try {
        await initAuth()

        if (!isUserAuthenticated()) {
            await startSignIn()
            return
        }

        const userInfo = getUserInfo()
        const custom = userInfo.customAttributes ?? {}
        const hasCompleteProfile = checkIfUserHasCompleteProfile()
        const missingFields = getMissingProfileFields()

        const fieldLabels: Record<string, string> = {
            firstname: "First Name",
            lastname: "Last Name",
            email: "Email",
            phone: "Phone",
            position: "Title / Position",
            company: "Company / Organization",
            industry: "Industry",
        }

        // Pre-fill form
        $("#firstname").val(userInfo.givenName || "")
        $("#lastname").val(userInfo.familyName || "")
        $("#email").val(userInfo.email || "")
        $("#phone").val((custom.phone as string) || "")
        $("#url").val((userInfo.website as string) || "")
        $("#position").val((custom.position as string) || "")
        $("#company").val((custom.company as string) || "")
        $("#industry").val((custom.industry as string) || "")

        $("#loader").hide()
        $("#profile-container").fadeIn(150)

        // Show missing fields warning
        if (!hasCompleteProfile) {
            const missingLabels = missingFields.map((f) => fieldLabels[f] || f)
            $("#notification-container").html(`
        <div class="alert alert-warning alert-dismissible fade show text-center mx-3 mt-3" role="alert">
          <strong>Complete your profile</strong> — please fill out the following fields:
          <br><em>${missingLabels.join(", ")}</em>.
          <button type="button" class="btn-close" data-mdb-dismiss="alert" aria-label="Close"></button>
        </div>
      `)
        }

        // Handle form submission
        $("#userProfile").on("submit", async (e) => {
            e.preventDefault()

            const profileData: Record<string, string> = {
                firstname: $("#firstname").val() as string,
                lastname: $("#lastname").val() as string,
                position: $("#position").val() as string,
                company: $("#company").val() as string,
                industry: $("#industry").val() as string,
                phone: $("#phone").val() as string,
                email: $("#email").val() as string,
            }

            const urlValue = $("#url").val() as string
            if (urlValue && urlValue.trim() !== "") {
                profileData.url = urlValue.trim()
            }

            try {
                await updateProfile(profileData)
                window.location.href = "/"
            } catch (err) {
                console.error("Profile update failed:", err)
                $("#notification-container").html(`
          <div class="alert alert-danger text-center mx-3 mt-3" role="alert">
            Failed to update your profile. Please try again.
          </div>
        `)
            }
        })
    } catch (err) {
        console.error("Failed to load user info:", err)
        $("#loader").hide()
        $("#profile-container").hide()
        $("#notification-container").html(`
      <div class="alert alert-danger text-center mx-3 mt-3" role="alert">
        Failed to load profile information. Please refresh the page.
      </div>
    `)
    }
})