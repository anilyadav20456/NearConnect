import { useEffect, useState } from "react";
import PersonCard from "./PersonCard";
import "./NearbyPeople.css";

const API = "https://nearconnect-backend-cavd.onrender.com";

export default function NearbyPeople({ radius }) {
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchNearbyPeople = async () => {
      const token = localStorage.getItem(
        "nearconnect_token"
      );

      if (!token) {
        setError("Please login again.");
        return;
      }

      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `${API}/api/users/nearby?radius=${radius}`,
          {
            method: "GET",

            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error ||
              data.message ||
              "Unable to find nearby people"
          );
        }

        /*
          Backend may return either:

          {
            users: [...]
          }

          or directly:

          [...]
        */

        const users =
          Array.isArray(data)
            ? data
            : data.users || [];

        setPeople(users);

      } catch (err) {
        console.error(
          "Nearby people error:",
          err
        );

        setError(err.message);
        setPeople([]);

      } finally {
        setLoading(false);
      }
    };

    fetchNearbyPeople();
  }, [radius]);


  if (loading) {
    return (
      <div className="nearby-state">

        <div className="nearby-loader"></div>

        <strong>
          Finding people nearby
        </strong>

        <p>
          Looking within {radius} km...
        </p>

      </div>
    );
  }


  if (error) {
    return (
      <div className="nearby-state nearby-state-error">

        <div className="nearby-state-icon">
          !
        </div>

        <strong>
          Something went wrong
        </strong>

        <p>
          {error}
        </p>

      </div>
    );
  }


  if (people.length === 0) {
    return (
      <div className="nearby-empty">

        <div className="nearby-empty-visual">

          <div className="nearby-empty-ring ring-one"></div>
          <div className="nearby-empty-ring ring-two"></div>

          <div className="nearby-empty-center">
            N
          </div>

        </div>

        <div className="nearby-empty-content">

          <strong>
            No one nearby yet
          </strong>

          <p>
            We couldn't find anyone within{" "}
            <b>{radius} km</b>.
            Try increasing your discovery range.
          </p>

        </div>

      </div>
    );
  }


  return (
    <div className="nearby-people-grid">

      {people.map((person, index) => (
        <PersonCard
          key={
            person.id ||
            person.user_id ||
            index
          }
          person={person}
        />
      ))}

    </div>
  );
}