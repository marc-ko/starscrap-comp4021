const Registration = (function () {
     const register = function(username,password,onSuccess,onError){
        
        const user = {
            username: username,
            password: password
        };

        fetch("/register", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(user)
        }).then((res) => res.json())
            .then((json) => {
                console.log("Successful");
                console.log(json);
                if (json.status === "error") {
                    console.error("Error:", json.error);
                    onError(json.error);
                    return;
                } else if (json.status === "success") {
                    onSuccess(json);
                }
            })
            .catch((err) => {
                console.error("Error:", err);
                onError(err);
            });


     };
     return { register };
})();