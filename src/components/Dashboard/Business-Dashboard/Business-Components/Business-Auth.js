import React from "react";
import { Modal } from "react-bootstrap";
import { useState } from "react";
import { useNavigate } from 'react-router-dom';
import { useStoreActions, useStoreState } from "easy-peasy";
import BusinessDashboardLayout from "../Business-Dashboard-Layout.";


export default function BusinessAuth(props) {
    const setBusiness = useStoreActions(actions => actions.setBusiness);
    const setBusinessUser = useStoreActions(actions => actions.setBusinessUser);
    const business_user = useStoreState(state => state.business_user);
    let navigate = useNavigate();
    const [error, setError] = useState("");
    const  {show, handleClose} = props;
    const [formData, setFormData] = useState({
        email: "",
        password: ""
    });

    const checkLoggedIn = () => {
        if(Object.keys(business_user).length === 0) {
            return false;
        }
        navigate("/BusinessDashboardLayout");
    }

  


   

    const handleFormSubmit = async () => {

        // if(formData.email === "" || formData.password === "") {
        //     setError("Please fill in all fields.");
        //     return;
        // }
        // const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/;
        // if(!emailRegex.test(formData.email)) {
        //     setError("Please enter a valid email address.");
        //     return;
        // }

        try {            
            const response = await fetch("http://localhost:3001/auth/business", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(formData)
            });
    
            if (!response.ok) {
                if(response.status === 400) {
                    setError("Username or Password is incorrect. Please try again.");
                }
            }
    
            const data = await response.json();
            if (data.success) {
                let tempBusinessUser = {
                    token : data.token,
                    business_id: data.business._id,
                    user_id : data.business.user_id,
                    business_type : data.business.business_type
                }
                setBusinessUser(tempBusinessUser);
                localStorage.setItem("business_user", JSON.stringify(tempBusinessUser));
                setBusiness(data.business);
                handleClose();
                navigate("/BusinessDashboardLayout");
            } else {
                setError("Username or Password is incorrect. Please try again.");
            }
        } catch (error) {
            console.error("An error occurred:", error);
        }
    }
    return (
        <div>
            <Modal 
            show={show}
            centered
            >
                <Modal.Header>
                    <Modal.Title className="textSecondary">Login to Business Account</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <form noValidate> 
                        <div className="form-group mt-3 textSecondary">
                            <label for="email" className="textSecondary">Email address or Username</label>
                            <input type="email" className="form-control mt-2" id="business_auth_email" aria-describedby="emailHelp"
                                onChange={(e) => setFormData({...formData, email: e.target.value})}
                                value={formData.email}
                            />
                            <small id="emailHelp" className="form-text text-muted">We'll never share your email with anyone else.</small>
                        </div>
                        <div className="form-group mt-3 textSecondary">
                            <label for="exampleInputPassword1" className="textSecondary">Password</label>
                            <input type="password" className="form-control mt-2 " id="exampleInputPassword1" 
                                onChange={(e) => setFormData({...formData, password: e.target.value})}
                                value={formData.password}
                            />
                        </div>
                        
                    </form>
                </Modal.Body>
                <Modal.Footer>
                    <button
                    className="btn btn-secondary"
                        onClick={
                            () => {
                                setFormData({
                                    email: "",
                                    password: ""
                                });
                                handleClose();
                                setError("");
                               
                            }
                        }
                    >Close</button>
                    <button
                    className="btn btn-primary px-4 "
                        onClick={() => handleFormSubmit()}
                    ><span>Login</span></button>
                </Modal.Footer>
                <span className="text-danger p-3 textBold">{error}</span>
            </Modal>
        </div>
    )
}