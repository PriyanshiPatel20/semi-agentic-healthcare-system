import { useEffect, useState } from "react";

import API from "../api";

import "../styles/reminderChat.css";

import { FaUserMd } from "react-icons/fa";

export default function DoctorReminderBox() {

    const [open, setOpen] = useState(false);

    const [reminders, setReminders] = useState([]);

    const fetchReminders = async () => {

        try {

            const user =
                JSON.parse(
                    localStorage.getItem("user")
                );

            const res = await API.get(
                "/reminders/doctor-reminders",
                {
                    headers: {

                        role: user.role,

                        userid: user.id,
                    },
                }
            );

            setReminders(res.data);

        } catch (error) {

            console.log(error);
        }
    };

    useEffect(() => {

        fetchReminders();

        const interval =
            setInterval(() => {

                fetchReminders();

            }, 5000);

        return () =>
            clearInterval(interval);

    }, []);

    return (
        <>
            {/* ICON */}
            <div
                className="doctor-reminder-icon"
                onClick={() => setOpen(!open)}
            >
                <FaUserMd />
            </div>

            {/* CHATBOX */}
            {open && (

                <div className="doctor-reminder-chatbox">

                    <div className="doctor-reminder-header">

                        AI Doctor Reminders

                    </div>

                    <div className="doctor-reminder-messages">

                        {reminders.length === 0 ? (

                            <p>
                                No reminders available
                            </p>

                        ) : (

                            reminders.map((r) => (

                                <div
                                    key={r.id}

                                    className="doctor-reminder-card"
                                >

                                    <p>
                                        {r.message}
                                    </p>

                                    <small>
                                        Patient:
                                        {" "}
                                        {
                                            r.appointment?.patient?.name
                                        }
                                    </small>

                                </div>
                            ))
                        )}

                    </div>
                </div>
            )}
        </>
    );
}