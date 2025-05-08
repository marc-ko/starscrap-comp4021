const Authentication = (function () {
    let user = null;

    const getUser = function () {
        return user;}
    const signin = function (username, password, onSuccess, onError) {
        const sign_user = {
            username: username,
            password: password
        };

        fetch("/signin", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(sign_user)

        }).then((res) => res.json())
        .then((json) => {
            console.log("Successful");
            console.log(json);
            if (json.status === "error") {
                console.error("Error:", json.error);
                onError(json.error);
                return;
            } else if (json.status === "success") {
                user = JSON.parse(json.user);
                onSuccess();
            }
        })
        .catch((err) => {
            console.error("Error:", err);
            onError(err);
        });

    };

    const vaildate = function (onSuccess, onError) {
        fetch("/validate", {
        method: "GET",
        headers: {
            "Content-Type": "application/json"
        }
        }).then((res) => res.json())
        .then((json) => {
            console.log("Successful");
            console.log(json);
            if (json.status === "error") {
                console.error("Error:", json.error);
                onError(json.error);
                return;
            } else if (json.status === "success") {
                user = JSON.parse(json.user);
                onSuccess();
            }
        })
        .catch((err) => {
            console.error("Error:", err);
            onError(err);
        });

    };

    const signout = function (onSuccess, onError) {
        fetch("/signout", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            }
        }).then((res) => res.json())
        .then((json) => {
            console.log("Successful");
            console.log(json);
            if (json.status === "error") {
                console.error("Error:", json.error);
                onError(json.error);
                return;
            } else if (json.status === "success") {
                user = null;
                onSuccess();
            }
        });
    };
    return { getUser, signin, vaildate, signout };

})();